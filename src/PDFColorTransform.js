import { Play, Upload } from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import React, { useState } from "react";

const PDFColorTransform = () => {
  const [file, setFile] = useState(null);
  const [contentColor, setContentColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  // Convert hex color to RGB values
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const processFile = async (pdfFile) => {
    try {
      // Load the source PDF
      const sourceBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(sourceBytes);

      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      const contentRgb = hexToRgb(contentColor);
      const backgroundRgb = hexToRgb(backgroundColor);

      // Process each page
      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Draw background
        page.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: height,
          color: rgb(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b),
        });

        // Get the page dictionary
        const pageDict = pdfDoc.context.lookup(page.ref);

        // Get the page's content streams
        const contentStream = pageDict.get("Contents");
        if (!contentStream) continue;

        // Get the stream data as string
        let streamData = "";
        if (Array.isArray(contentStream)) {
          for (const stream of contentStream) {
            const data = pdfDoc.context.lookup(stream);
            streamData += data.toString() + "\n";
          }
        } else {
          streamData = pdfDoc.context.lookup(contentStream).toString();
        }

        // Replace color operators in the content stream
        const modifiedStream = streamData
          // Replace RGB color operators
          .replace(
            /([0-9.]+\s+){2}[0-9.]+\s+(rg|RG)/g,
            `${contentRgb.r} ${contentRgb.g} ${contentRgb.b} $2`
          )
          // Replace CMYK color operators
          .replace(
            /([0-9.]+\s+){3}[0-9.]+\s+(k|K)/g,
            `${contentRgb.r} ${contentRgb.g} ${contentRgb.b} 0 $2`
          )
          // Replace grayscale color operators
          .replace(
            /([0-9.]+)\s+(g|G)/g,
            `${contentRgb.r} ${contentRgb.g} ${contentRgb.b} $2`
          );

        // Create a new stream with modified content
        const newStream = pdfDoc.context.stream(modifiedStream);
        pageDict.set("Contents", newStream);

        setProgress(((i + 1) / totalPages) * 100);
      }

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();

      // Create and download the new PDF
      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transformed-${pdfFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true);
    processFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-semibold text-center mb-6">
            PDF Color Transform
          </h1>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
              ${file ? "border-green-500 bg-green-50" : ""}`}
          >
            {!file ? (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">
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
              <div className="text-green-600">
                <p className="font-medium">{file.name}</p>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-500 mt-2 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Color Settings */}
          {file && !isProcessing && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Content Color:</label>
                <input
                  type="color"
                  value={contentColor}
                  onChange={(e) => setContentColor(e.target.value)}
                  className="w-20 h-10 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Background Color:</label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-20 h-10 rounded cursor-pointer"
                />
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Preview Colors
                </h3>
                <div className="flex gap-4">
                  <div
                    className="w-16 h-16 rounded shadow-sm"
                    style={{ backgroundColor: contentColor }}
                  />
                  <div
                    className="w-16 h-16 rounded shadow-sm"
                    style={{ backgroundColor: backgroundColor }}
                  />
                </div>
              </div>
              <button
                onClick={() => handleProcess()}
                className="w-full mt-4 bg-green-500 text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-600"
              >
                <Play className="w-4 h-4" />
                Start Processing
              </button>
            </div>
          )}

          {/* Processing Animation */}
          {isProcessing && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Processing PDF... {progress.toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFColorTransform;
