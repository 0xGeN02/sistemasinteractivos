import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { ScrollArea } from "./components/ui/scroll-area";
import { StudyMaterial } from "./components/StudyMaterial";
import ReciteStudy from "./components/ReciteStudy";
import { PracticeTesting } from "./components/PracticeTesting";
import { BookOpen, Brain, Plus, Trash2, X } from "lucide-react";

interface Material {
  id: string;
  name: string;
  type: "pdf" | "text";
  content: string; // Contenido del PDF/texto
  size?: number; // Tamaño en bytes
  uploadedAt: string;
}

interface Chat {
  id: string;
  title: string;
  type: "study" | "practice";
  createdAt: string;
  materials: Material[];
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentMaterial, setCurrentMaterial] = useState<string>("");
  const [materialAdded, setMaterialAdded] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [newChatType, setNewChatType] = useState<"study" | "practice">("study");
  const [loading, setLoading] = useState(true);

  const currentChat = chats.find((c) => c.id === currentChatId);

  // Cargar chats existentes al iniciar
  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await fetch("/api/chats");
        if (response.ok) {
          const data = await response.json();
          console.log("Chats cargados desde DB:", data);
          
          // Mapear los chats para asegurar que tienen el formato correcto
          const mappedChats: Chat[] = data.map((chat: any) => ({
            id: chat.id,
            title: chat.title,
            type: chat.type || "study", // Mantener el tipo original del backend
            createdAt: chat.createdAt,
            materials: chat.materials || [],
          }));
          
          setChats(mappedChats);
        }
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  const handleCreateChat = (type: "study" | "practice") => {
    setNewChatType(type);
    setNewChatTitle("");
    setShowNewChatDialog(true);
  };

  const handleConfirmNewChat = async () => {
    if (!newChatTitle.trim()) return;

    const fallbackId = Date.now().toString();

    try {
      const resp = await fetch(`/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChatTitle, type: newChatType }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Failed to create chat: ${resp.status} ${resp.statusText} ${text}`);
      }

      const created = await resp.json();

      const chat: Chat = {
        id: created.id || fallbackId,
        title: created.title || newChatTitle,
        type: newChatType,
        createdAt: created.createdAt || new Date().toISOString(),
        materials: created.materials || [],
      };

      setChats([chat, ...chats]);
      setCurrentChatId(chat.id);
    } catch (err) {
      console.error("Error creating chat on backend, creating locally instead:", err);
      const chat: Chat = {
        id: fallbackId,
        title: newChatTitle,
        type: newChatType,
        createdAt: new Date().toISOString(),
        materials: [],
      };
      setChats([chat, ...chats]);
      setCurrentChatId(chat.id);
      alert("No se pudo crear el chat en el backend. Se creó localmente.");
    } finally {
      setCurrentMaterial("");
      setMaterialAdded(false);
      setShowNewChatDialog(false);
      setNewChatTitle("");
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.statusText}`);
      }

      // Actualizar estado local después de eliminar en el servidor
      setChats(chats.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setCurrentMaterial("");
        setMaterialAdded(false);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Error al eliminar el chat. Por favor, intenta de nuevo.");
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    const chat = chats.find((c) => c.id === chatId);
    
    // Si el chat tiene materiales, combinar todo el contenido
    if (chat?.materials && chat.materials.length > 0) {
      try {
        // Cargar contenido completo de todos los materiales
        const materialContents = await Promise.all(
          chat.materials.map(async (material) => {
            // Si el contenido parece truncado o es un placeholder, cargar el archivo completo
            if (material.content.includes("[File:") || material.content.length < 100) {
              try {
                const response = await fetch(`/api/materials/${material.id}/content`);
                if (response.ok) {
                  const data = await response.json();
                  return data.content;
                }
              } catch (err) {
                console.error(`Error loading material ${material.id}:`, err);
              }
            }
            return material.content;
          })
        );
        
        // Combinar todos los materiales
        const combined = materialContents.join("\n\n---\n\n");
        setCurrentMaterial(combined);
        setMaterialAdded(true);
      } catch (error) {
        console.error("Error loading materials:", error);
        // Fallback: usar el contenido que tenemos
        const combined = chat.materials.map(m => m.content).join("\n\n---\n\n");
        setCurrentMaterial(combined);
        setMaterialAdded(true);
      }
    } else {
      setCurrentMaterial("");
      setMaterialAdded(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete material: ${response.statusText}`);
      }

      // Actualizar estado local después de eliminar en el servidor
      setChats(chats.map((chat) => {
        if (chat.id === currentChatId) {
          const updatedMaterials = chat.materials.filter((m) => m.id !== materialId);
          
          // Si ya no hay materiales, limpiar el material actual
          if (updatedMaterials.length === 0) {
            setCurrentMaterial("");
            setMaterialAdded(false);
          } else {
            // Recombinar los materiales restantes
            const combined = updatedMaterials.map(m => m.content).join("\n\n---\n\n");
            setCurrentMaterial(combined);
          }
          
          return {
            ...chat,
            materials: updatedMaterials,
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Error al eliminar el material. Por favor, intenta de nuevo.");
    }
  };

  const handleMaterialSubmit = (material: string, fileName?: string) => {
    if (material && material.trim().length > 0 && currentChatId) {
      // Combinar materiales para mostrar en estudio/práctica
      const allMaterials = currentChat?.materials.map(m => m.content).join("\n\n---\n\n") || "";
      const combinedMaterial = allMaterials ? `${allMaterials}\n\n---\n\n${material}` : material;
      
      setCurrentMaterial(combinedMaterial);
      setMaterialAdded(true);
      
      // Guardar como material de texto vía API
      uploadTextMaterial(currentChatId, material, fileName);
    }
  };

  const uploadTextMaterial = async (chatId: string, content: string, name?: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || `Material ${new Date().toLocaleString()}`,
          type: "text",
          content,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Failed to upload material: ${response.status} ${response.statusText} ${text}`);
      }

      const material = await response.json();
      
      // Actualizar el chat con el nuevo material usando callback
      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              materials: [
                ...chat.materials,
                {
                  id: material.id,
                  name: material.name,
                  type: material.type,
                  content: material.content || content,
                  size: content.length,
                  uploadedAt: material.createdAt,
                },
              ],
            };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error("Error uploading text material:", error);
      alert("Error al guardar el material de texto");
    }
  };

  const uploadPdfFiles = async (chatId: string, files: File[]) => {
    try {
      const newMaterials: Material[] = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `/api/chats/${chatId}/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to upload ${file.name}: ${response.status} ${response.statusText} ${text}`);
        }

        const material = await response.json();
        
        newMaterials.push({
          id: material.id,
          name: material.name,
          type: material.type,
          content: material.content,
          size: material.size || file.size,
          uploadedAt: material.createdAt,
        });
      }

      // Actualizar chats con todos los nuevos materiales
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              materials: [...chat.materials, ...newMaterials],
            };
          }
          return chat;
        })
      );

      // Combinar todos los materiales para mostrar
      setChats(prevChats => {
        const updatedChat = prevChats.find(c => c.id === chatId);
        if (updatedChat?.materials) {
          const combined = updatedChat.materials
            .map(m => m.content)
            .join("\n\n---\n\n");
          setCurrentMaterial(combined);
          setMaterialAdded(true);
        }
        return prevChats;
      });
    } catch (error) {
      console.error("Error uploading PDF files:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Error al subir los archivos PDF: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/50 flex flex-col">
          {/* Header del sidebar */}
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm">Mis Chats</h2>
          </div>

          {/* Botones para crear */}
          <div className="p-4 space-y-3 border-b">
            <Button
              onClick={() => handleCreateChat("study")}
              size="sm"
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Estudio
            </Button>
            <Button
              onClick={() => handleCreateChat("practice")}
              size="sm"
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Práctica
            </Button>
          </div>

          {/* Lista de chats */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chats.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <p>Sin chats aún</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      currentChatId === chat.id
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    {chat.type === "study" ? (
                      <BookOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <Brain className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{chat.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        await handleDeleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!currentChatId ? (
            // Pantalla vacía
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-2xl font-semibold mb-2">Bienvenido a StudyAI</h1>
                <p className="text-muted-foreground mb-6">
                  Selecciona o crea un chat para empezar
                </p>
            <div className="space-y-4 w-full max-w-sm">
                  <Button onClick={() => handleCreateChat("study")} className="h-16 w-full text-lg font-semibold">
                    <BookOpen className="mr-3 h-6 w-6" />
                    Nuevo Estudio
                  </Button>
                  <Button onClick={() => handleCreateChat("practice")} variant="outline" className="h-16 w-full text-lg font-semibold">
                    <Brain className="mr-3 h-6 w-6" />
                    Nueva Práctica
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Chat activo
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat header */}
              <div className="border-b p-4">
                <div className="flex items-center gap-2 mb-4">
                  {currentChat?.type === "study" ? (
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Brain className="h-5 w-5 text-purple-500" />
                  )}
                  <div>
                    <h2 className="font-semibold">{currentChat?.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {currentChat?.type === "study"
                        ? "Modo Estudio"
                        : "Modo Práctica"}
                    </p>
                  </div>
                </div>
                
                {/* Materiales guardados */}
                {currentChat?.materials && currentChat.materials.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Materiales guardados ({currentChat.materials.length})
                    </p>
                    <div className="space-y-1">
                      {currentChat.materials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors group"
                        >
                          <button
                            onClick={() => setCurrentMaterial(material.content)}
                            className="flex-1 text-left text-sm"
                          >
                            📄 {material.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {currentChat?.type === "study" ? (
                    // Estudio: Material + Recitar
                    <>
                      {!materialAdded ? (
                        <StudyMaterial 
                          onMaterialSubmit={handleMaterialSubmit}
                          onPdfUpload={currentChatId ? (files) => uploadPdfFiles(currentChatId, files) : undefined}
                        />
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <StudyMaterial 
                              onMaterialSubmit={handleMaterialSubmit}
                              onPdfUpload={currentChatId ? (files) => uploadPdfFiles(currentChatId, files) : undefined}
                            />
                          </div>
                          <ReciteStudy expectedAnswer={currentMaterial} />
                        </div>
                      )}
                    </>
                  ) : (
                    // Práctica: Generar preguntas
                    <>
                      {!materialAdded ? (
                        <div className="max-w-2xl mx-auto">
                          <Card className="p-6 text-center">
                            <p className="text-muted-foreground mb-4">
                              Carga material primero para practicar
                            </p>
                            <StudyMaterial 
                              onMaterialSubmit={handleMaterialSubmit}
                              onPdfUpload={currentChatId ? (files) => uploadPdfFiles(currentChatId, files) : undefined}
                            />
                          </Card>
                        </div>
                      ) : (
                        <PracticeTesting material={currentMaterial} />
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear chat */}
      {showNewChatDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md">
            {/* Header */}
            <div className="border-b p-8 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Nuevo Chat de {newChatType === "study" ? "Estudio" : "Práctica"}
              </h2>
              <button
                onClick={() => setShowNewChatDialog(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div>
                <label className="text-sm font-medium block mb-3">Nombre del chat</label>
                <input
                  type="text"
                  placeholder="Ej: Matemáticas - Capítulo 5"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && newChatTitle.trim() && handleConfirmNewChat()
                  }
                  autoFocus
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-8 flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowNewChatDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmNewChat}
                disabled={!newChatTitle.trim()}
              >
                Crear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}