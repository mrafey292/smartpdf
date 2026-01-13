import pLimit from 'p-limit';
import { getGeminiModel } from '../gemini';
import type { PDFBatch } from '@/types/rag';

/**
 * Extract text from PDF buffer
 * @param buffer PDF file buffer
 * @returns Extracted text and page count
 */
export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
    try {
        // Use legacy build for Node.js/server-side environments as recommended by pdfjs-dist
        // The legacy build avoids browser-only APIs (e.g., DOMMatrix)
            // Load pdfjs legacy build (preferred for Node/SSR) with fallback to modern build.
            const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => import('pdfjs-dist/build/pdf'));

        // In SSR/Node, disable the worker so pdf.js runs in the main thread
        // This avoids bundler issues trying to locate the worker file
            // Point to the legacy worker script per official docs
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

        // Load PDF document from buffer with worker disabled
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            disableWorker: true,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
        } as any);

        const pdfDocument = await loadingTask.promise;
        const numPages = pdfDocument.numPages;

        console.log(`PDF loaded: ${numPages} pages`);

        // Extract text from all pages
        let fullText = '';
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Extract text items and join with spaces
            const pageText = textContent.items
                .map((item: any) => {
                    // Handle both TextItem and TextMarkedContent
                    if ('str' in item) {
                        return item.str;
                    }
                    return '';
                })
                .filter((text: string) => text.trim().length > 0)
                .join(' ');
            
            fullText += pageText + '\n\n';
        }

        // Clean up
        await pdfDocument.destroy();

        return {
            text: fullText.trim(),
            numPages,
        };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Split PDF text into page batches
 * @param text Full PDF text
 * @param numPages Total number of pages
 * @param pagesPerBatch Number of pages per batch (default: 7)
 * @returns Array of batches
 */
export function createBatches(
    text: string,
    numPages: number,
    pagesPerBatch: number = 7
): PDFBatch[] {
    const batches: PDFBatch[] = [];

    // Estimate characters per page
    const charsPerPage = Math.ceil(text.length / numPages);

    for (let i = 0; i < numPages; i += pagesPerBatch) {
        const startPage = i + 1;
        const endPage = Math.min(i + pagesPerBatch, numPages);

        // Extract text for this batch
        const startChar = i * charsPerPage;
        const endChar = Math.min(endPage * charsPerPage, text.length);
        const batchText = text.substring(startChar, endChar);

        batches.push({
            batchNumber: Math.floor(i / pagesPerBatch) + 1,
            startPage,
            endPage,
            text: batchText,
        });
    }

    return batches;
}

/**
 * Convert a batch of text to clean Markdown using Gemini
 * @param batch The batch to convert
 * @returns Markdown text
 */
async function convertBatchToMarkdown(batch: PDFBatch): Promise<string> {
    try {
        const model = getGeminiModel();

        const prompt = `
You are an expert document parser. Convert the following text from a PDF document into clean, structured Markdown optimized for text-only reading.

Rules:
1. CRITICALLY IMPORTANT: Identify and mark ALL headings using proper Markdown syntax (# for H1, ## for H2, ### for H3, etc.). Look for:
   - Titles and section headings (typically larger or bold text)
   - Chapter names and numbers
   - Subsection titles
   - Any text that appears to be a header or title
2. Each heading MUST start with # symbols followed by a space, then the heading text. Example: "# Chapter 1" or "## Introduction"
3. IMAGES: Do NOT include image markdown syntax ![...]. Instead, replace any images with a simple text description like: [Image: brief description of what the image shows]
4. TABLES: Convert tables to simple descriptive text or numbered lists. Do NOT use markdown table syntax (| and -). Instead describe the table content in plain sentences or bullet points.
5. Preserve lists (bulleted using - or * and numbered using 1. 2. 3.).
6. Maintain the logical flow and structure of the document.
7. IMPORTANT: This text is from pages ${batch.startPage} to ${batch.endPage}. At the start, insert [PAGE_BREAK_${batch.startPage}]. For each subsequent page in this batch, insert [PAGE_BREAK_n] where n is the page number.
8. Do not add any commentary, intro/outro text, or markdown code block markers (no \`\`\`markdown). Just output the raw Markdown content.
9. If there are mathematical formulas, use LaTeX notation or clear text representation.
10. Remove any artifacts from PDF extraction (like page numbers, headers/footers that repeat).
11. Ensure proper spacing: one blank line before headings, one blank line after headings.

Text to convert:
${batch.text}
    `.trim();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(`Error converting batch ${batch.batchNumber} to Markdown:`, error);
        throw error;
    }
}

/**
 * Process PDF with batching and stitching strategy
 * @param buffer PDF file buffer
 * @param pagesPerBatch Number of pages per batch (default: 7)
 * @param concurrencyLimit Maximum concurrent batch processing (default: 3)
 * @returns Full Markdown text and metadata
 */
export async function processPDF(
    buffer: Buffer,
    pagesPerBatch: number = 20,
    concurrencyLimit: number = 2
): Promise<{
    markdown: string;
    numPages: number;
    batches: PDFBatch[];
    failedBatches: number[];
}> {
    console.log('Starting PDF processing...');

    // Step 1: Parse PDF
    console.log('Step 1: Parsing PDF...');
        const { text, numPages } = await parsePDF(buffer);
    console.log(`Parsed PDF: ${numPages} pages, ${text.length} characters`);

    // Step 2: Create batches
    console.log(`Step 2: Creating batches (${pagesPerBatch} pages per batch)...`);
    const batches = createBatches(text, numPages, pagesPerBatch);
    console.log(`Created ${batches.length} batches`);

    // Step 3: Process batches in parallel with concurrency limit
    console.log(`Step 3: Converting batches to Markdown (concurrency: ${concurrencyLimit})...`);
    const limit = pLimit(concurrencyLimit);
    const failedBatches: number[] = [];

    // Simple token-bucket rate limiter to respect free-tier limits — slowed to 6/min for safety
    const MAX_REQUESTS_PER_MINUTE = 6;
    let windowStart = Date.now();
    let usedInWindow = 0;

    async function acquireSlot() {
        const now = Date.now();
        const elapsed = now - windowStart;
        if (elapsed >= 60_000) {
            windowStart = now;
            usedInWindow = 0;
        }
        if (usedInWindow < MAX_REQUESTS_PER_MINUTE) {
            usedInWindow++;
            return;
        }
        const waitMs = 60_000 - elapsed + 250; // small buffer to avoid flakiness
        console.log(`Rate limit reached. Waiting ${waitMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        windowStart = Date.now();
        usedInWindow = 1;
    }

    const batchPromises = batches.map((batch) =>
        limit(async () => {
            try {
                // Throttle requests: acquire a slot before calling Gemini
                await acquireSlot();
                console.log(`Processing batch ${batch.batchNumber}/${batches.length} (pages ${batch.startPage}-${batch.endPage})...`);
                const markdown = await convertBatchToMarkdown(batch);
                batch.markdown = markdown;
                console.log(`✓ Completed batch ${batch.batchNumber}`);
            } catch (error) {
                console.error(`✗ Failed batch ${batch.batchNumber}:`, error);
                batch.error = error instanceof Error ? error.message : 'Unknown error';
                failedBatches.push(batch.batchNumber);
                // Use original text as fallback
                batch.markdown = batch.text;
            }
        })
    );

    await Promise.all(batchPromises);

    // Step 4: Stitch batches together
    console.log('Step 4: Stitching batches together...');
    const markdown = batches
        .map((batch) => batch.markdown || batch.text)
        .join('\n\n---\n\n'); // Add separator between batches

    console.log(`✓ PDF processing complete! Total length: ${markdown.length} characters`);

    if (failedBatches.length > 0) {
        console.warn(`Warning: ${failedBatches.length} batches failed to convert. Using original text as fallback.`);
    }

    return {
        markdown,
        numPages,
        batches,
        failedBatches,
    };
}

/**
 * Process PDF from file path (for testing)
 * @param filePath Path to PDF file
 * @param pagesPerBatch Number of pages per batch
 * @param concurrencyLimit Maximum concurrent batch processing
 */
export async function processPDFFromFile(
    filePath: string,
    pagesPerBatch: number = 7,
    concurrencyLimit: number = 3
) {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return processPDF(buffer, pagesPerBatch, concurrencyLimit);
}
