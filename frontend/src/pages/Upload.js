import React, { useState } from "react";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [sku, setSku] = useState("");
  const [alt, setAlt] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) {
      setError("Please pick a file");
      return;
    }

    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    if (sku) fd.append("sku", sku);
    if (alt) fd.append("alt_text", alt);

    try {
      const res = await fetch("/api/upload-image/", { 
        method: "POST", 
        body: fd 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload failed");
      }
      
      const json = await res.json();
      setUrl(json.file);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Image</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SKU (optional)
          </label>
          <input
            type="text"
            placeholder="Enter SKU or identifier"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alt Text (optional)
          </label>
          <input
            type="text"
            placeholder="Enter alt text for accessibility"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image File
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        {url && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">Uploaded Image:</h3>
            <div className="text-sm text-gray-600 mb-2">
              URL: <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{url}</a>
            </div>
            <img 
              src={url} 
              alt={alt || sku || "uploaded"} 
              className="max-w-full h-auto max-h-80 object-contain rounded-md"
            />
          </div>
        )}
      </div>
    </div>
  );
}
