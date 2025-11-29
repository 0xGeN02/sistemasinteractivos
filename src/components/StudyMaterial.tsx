import { useState } from "react";
import { Upload, Plus, Trash2, File as FileIcon, Eye, X, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";

interface StudyMaterialProps {
  onMaterialSubmit: (material: string, fileName?: string) => void;
  onPdfUpload?: (files: File[]) => void;
}

interface MaterialSource {
  id: string;
  name: string;
  content: string;
  type: "pdf" | "text";
}

export function StudyMaterial({ onMaterialSubmit, onPdfUpload }: StudyMaterialProps) {
  const [materialText, setMaterialText] = useState("");
  const [materialSources, setMaterialSources] = useState<MaterialSource[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [uploadedPdfs, setUploadedPdfs] = useState<MaterialSource[]>([]);
  const [showPdfPreview, setShowPdfPreview] = useState<string | null>(null);

  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          // Simulamos extracción de PDF
          const extractedText = text.substring(0, 2000);
          resolve(extractedText);
        } catch (err) {
          resolve("");
        }
      };
      reader.readAsText(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    const files = [...e.dataTransfer.files];
    const pdfFiles = files.filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));

    if (files.length > 0 && pdfFiles.length === 0) {
      setError("Por favor, sube solo archivos PDF");
      return;
    }

    if (pdfFiles.length === 0) return;

    for (const file of pdfFiles) {
      try {
        const content = await extractPdfText(file);
        if (content) {
          const newPdf: MaterialSource = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            content,
            type: "pdf"
          };
          setUploadedPdfs(prev => [...prev, newPdf]);
        }
      } catch (err) {
        setError("Error al procesar el archivo PDF");
        console.error(err);
      }
    }
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMaterialText(e.target.value);
  };

  const handleAddTextMaterial = () => {
    if (!materialText.trim()) {
      setError("Por favor, escribe algo de contexto");
      return;
    }

    const newTextMaterial: MaterialSource = {
      id: Date.now().toString(),
      name: `Contexto Texto ${materialSources.filter(m => m.type === "text").length + 1}`,
      content: materialText,
      type: "text"
    };

    setMaterialSources([...materialSources, newTextMaterial]);
    setMaterialText("");
    setError("");
  };

  const handleAddPdfToMaterials = (pdf: MaterialSource) => {
    setMaterialSources([...materialSources, pdf]);
    setUploadedPdfs(uploadedPdfs.filter(p => p.id !== pdf.id));
    setShowPdfPreview(null);
  };

  const handleRemovePdfFromUpload = (id: string) => {
    setUploadedPdfs(uploadedPdfs.filter(p => p.id !== id));
    setShowPdfPreview(null);
  };

  const handleRemoveFromMaterials = (id: string) => {
    setMaterialSources(materialSources.filter(m => m.id !== id));
  };

  const combinedMaterialContent = materialSources
    .map(source => `[${source.type === "pdf" ? "PDF" : "Contexto"}: ${source.name}]\n${source.content}`)
    .join("\n\n---\n\n");

  const handleStartStudy = async () => {
    if (materialSources.length === 0) {
      setError("Por favor, agrega al menos una fuente de temario");
      return;
    }
    
    // Separar PDFs y textos
    const pdfFiles = materialSources
      .filter(source => source.type === "pdf")
      .map(source => {
        // Crear un File a partir de los datos del PDF
        return new File(
          [source.content],
          source.name,
          { type: "application/pdf" }
        );
      });

    const textMaterials = materialSources.filter(source => source.type === "text");

    try {
      // Subir PDFs si existen y tenemos el handler
      if (pdfFiles.length > 0 && onPdfUpload) {
        await onPdfUpload(pdfFiles);
      }

      // Enviar materiales de texto
      for (const source of textMaterials) {
        onMaterialSubmit(source.content, source.name);
      }

      // Limpiar
      setMaterialSources([]);
      setMaterialText("");
    } catch (error) {
      console.error("Error al procesar materiales:", error);
      setError("Error al procesar los materiales");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drag and Drop PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileIcon className="h-5 w-5" />
            <span>Cargar PDFs</span>
          </CardTitle>
          <CardDescription>
            Arrastra múltiples archivos PDF aquí (temarios, apuntes, etc)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-semibold">Arrastra tus PDFs aquí</p>
            <p className="text-sm text-muted-foreground">Puedes subir varios a la vez</p>
          </div>
        </CardContent>
      </Card>

      {/* PDFs to Upload Preview */}
      {uploadedPdfs.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">PDFs Listos para Agregar ({uploadedPdfs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploadedPdfs.map((pdf) => (
              <div key={pdf.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{pdf.name}</p>
                  <p className="text-xs text-muted-foreground">{pdf.content.length} caracteres</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPdfPreview(showPdfPreview === pdf.id ? null : pdf.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => handleAddPdfToMaterials(pdf)}
                  >
                    Agregar
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePdfFromUpload(pdf.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* PDF Preview */}
            {showPdfPreview && uploadedPdfs.find(p => p.id === showPdfPreview) && (
              <div className="mt-4 p-3 bg-white rounded border max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold mb-2">
                  Preview: {uploadedPdfs.find(p => p.id === showPdfPreview)?.name}
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {uploadedPdfs.find(p => p.id === showPdfPreview)?.content}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Text Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Agregar Contexto Texto</span>
          </CardTitle>
          <CardDescription>
            Escribe notas, explicaciones o contexto adicional del temario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contenido Adicional</label>
            <Textarea
              placeholder="Añade notas, conceptos clave, definiciones o cualquier contexto que consideres importante..."
              value={materialText}
              onChange={handleTextInput}
              className="min-h-40"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {materialText.length} caracteres
              </p>
            </div>
          </div>
          <Button 
            onClick={handleAddTextMaterial}
            className="w-full"
            disabled={!materialText.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Contexto
          </Button>
        </CardContent>
      </Card>

      {/* Material Sources Combined */}
      {materialSources.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Temario Compilado</CardTitle>
              </div>
              <Badge>{materialSources.length} fuente{materialSources.length !== 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* List of Materials */}
            <div className="space-y-2">
              {materialSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{source.name}</p>
                      <Badge variant={source.type === "pdf" ? "default" : "secondary"} className="text-xs">
                        {source.type === "pdf" ? "PDF" : "Texto"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{source.content.length} caracteres</p>
                  </div>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFromMaterials(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total Info */}
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-muted-foreground">
                <strong>Total del temario:</strong> {combinedMaterialContent.length} caracteres compilados
              </p>
            </div>

            {/* Start Study Button */}
            <Button 
              onClick={handleStartStudy}
              className="w-full"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Comenzar a Estudiar con Este Temario
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {materialSources.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground text-sm">
              Agrega PDFs o contexto de texto para comenzar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
