# compress

A static WebP compression site designed for Cloudflare Pages. Drop or select multiple images and the browser converts them to WebP at 97% quality, scaling resolution in steps until they land under your target size (500KB by default).

## Usage

1. Open `index.html` locally or deploy the repo to Cloudflare Pages.
2. Adjust the target size slider if you need something other than 500KB.
3. Drag and drop or click to select multiple images—the compression starts instantly.
4. Download the resulting WebP files once the progress cards show "Compression ready."

All processing happens in your browser; no images are uploaded to any server.
