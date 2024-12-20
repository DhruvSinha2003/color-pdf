import { Play, Upload } from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import React, { useState } from "react";

const PDFColorInverter = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  const invertColors = async (pdfFile) => {
    try {
      const sourceBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(sourceBytes);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      // Process each page
      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const pageDict = pdfDoc.context.lookup(page.ref);
        const contentStream = pageDict.get("Contents");
        if (!contentStream) continue;

        // Get all content streams
        const streams = Array.isArray(contentStream)
          ? contentStream
          : [contentStream];
        let streamData = "";

        for (const stream of streams) {
          const data = pdfDoc.context.lookup(stream);
          streamData += data.toString() + "\n";
        }

        // Add commands to set the background to black at the start
        let modifiedStream =
          "1 1 1 rg\n" + // Set fill color to white
          "0 0 " +
          page.getWidth() +
          " " +
          page.getHeight() +
          " re\n" + // Create rectangle
          "f\n" + // Fill the rectangle
          "0 0 0 rg\n"; // Reset fill color to black

        // Replace color operators in the original content
        modifiedStream += streamData
          // Handle grayscale
          .replace(/(\d+\.?\d*|\.\d+)\s+g/g, (match) => {
            const value = parseFloat(match);
            return `${(1 - value).toFixed(3)} g`;
          })
          .replace(/(\d+\.?\d*|\.\d+)\s+G/g, (match) => {
            const value = parseFloat(match);
            return `${(1 - value).toFixed(3)} G`;
          })
          // Handle RGB
          .replace(
            /(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+rg/g,
            (match) => {
              const [r, g, b] = match.split(/\s+/).map(Number);
              return `${(1 - r).toFixed(3)} ${(1 - g).toFixed(3)} ${(
                1 - b
              ).toFixed(3)} rg`;
            }
          )
          .replace(
            /(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+RG/g,
            (match) => {
              const [r, g, b] = match.split(/\s+/).map(Number);
              return `${(1 - r).toFixed(3)} ${(1 - g).toFixed(3)} ${(
                1 - b
              ).toFixed(3)} RG`;
            }
          )
          // Handle CMYK
          .replace(
            /(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+k/g,
            (match) => {
              const [c, m, y, k] = match.split(/\s+/).map(Number);
              return `${(1 - c).toFixed(3)} ${(1 - m).toFixed(3)} ${(
                1 - y
              ).toFixed(3)} ${(1 - k).toFixed(3)} k`;
            }
          )
          .replace(
            /(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+(\d+\.?\d*|\.\d+)\s+K/g,
            (match) => {
              const [c, m, y, k] = match.split(/\s+/).map(Number);
              return `${(1 - c).toFixed(3)} ${(1 - m).toFixed(3)} ${(
                1 - y
              ).toFixed(3)} ${(1 - k).toFixed(3)} K`;
            }
          );

        // Create new stream with modified content
        const newStream = pdfDoc.context.stream(modifiedStream);
        pageDict.set("Contents", newStream);

        setProgress(((i + 1) / totalPages) * 100);
      }

      // Generate preview of first page
      if (totalPages > 0) {
        const previewDoc = await PDFDocument.create();
        const [firstPage] = await previewDoc.copyPages(pdfDoc, [0]);
        previewDoc.addPage(firstPage);
        const previewBytes = await previewDoc.save();
        const previewBlob = new Blob([previewBytes], {
          type: "application/pdf",
        });
        const previewUrl = URL.createObjectURL(previewBlob);
        setPreviewUrl(previewUrl);
      }

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inverted-${pdfFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsProcessing(false);
      setProgress(0);
    } catch (error) {
      console.error("Error processing PDF:", error);
      setIsProcessing(false);
      setProgress(0);
      alert("Error processing PDF. Please try again.");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setPreviewUrl(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewUrl(null);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true);
    invertColors(file);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-semibold text-center mb-6">
            PDF Color Inverter
          </h1>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${
                  dragActive ? "border-blue-500 bg-blue-900" : "border-gray-600"
                }
                ${file ? "border-green-500 bg-green-900" : ""}`}
          >
            {!file ? (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">
                  Drag and drop your PDF here or
                </p>
                <label className="inline-block bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
                  Browse Files
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                  />
                </label>
              </>
            ) : (
              <div className="text-green-400">
                <p className="font-medium">{file.name}</p>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-sm text-red-400 mt-2 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Preview Area */}
          {previewUrl && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Preview (First Page)
              </h3>
              <div className="w-full h-96 bg-gray-700 rounded-lg overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              </div>
            </div>
          )}

          {/* Process Button */}
          {file && !isProcessing && (
            <button
              onClick={handleProcess}
              className="w-full mt-6 bg-green-500 text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-600"
            >
              <Play className="w-4 h-4" />
              Invert Colors
            </button>
          )}

          {/* Processing Animation */}
          {isProcessing && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-400">
                Inverting colors... {progress.toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFColorInverter;
