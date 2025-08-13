import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, File, Image, Video, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadItem {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  uploaded_at: string;
}

const FileUpload = () => {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID on mount
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadUserFiles(user.id);
      }
    };
    getUser();
  }, []);

  const loadUserFiles = async (userIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from("branding_assets")
        .select("*")
        .eq("user_id", userIdParam)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const fileItems: FileUploadItem[] = data.map((asset) => ({
        id: asset.id,
        name: asset.storage_path.split("/").pop() || "Unknown",
        size: (asset.metadata as any)?.size || 0,
        type: asset.type,
        storage_path: asset.storage_path,
        uploaded_at: asset.created_at,
      }));

      setFiles(fileItems);
    } catch (error) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos existentes",
        variant: "destructive",
      });
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = async (fileList: File[]) => {
    if (!userId) return;

    const validFiles = fileList.filter((file) => {
      const isValidType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const isValidSize = file.size <= 200 * 1024 * 1024; // 200MB

      if (!isValidType) {
        toast({
          title: "Tipo de archivo no válido",
          description: `${file.name} no es un archivo de imagen o video`,
          variant: "destructive",
        });
        return false;
      }

      if (!isValidSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} excede el límite de 200MB`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    for (const file of validFiles) {
      setUploading((prev) => [...prev, file.name]);

      try {
        const bucket = file.type.startsWith("image/") ? "branding" : "brolls";
        const filePath = `${userId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Register in branding_assets table
        const assetType = file.type.startsWith("image/") ? "logo" : "broll";
        const { error: dbError } = await supabase.rpc("rpc_register_branding_asset", {
          p_type: assetType,
          p_storage_path: `${bucket}/${filePath}`,
          p_metadata: {
            size: file.size,
            type: file.type,
            name: file.name,
          },
        });

        if (dbError) throw dbError;

        // Remove from uploading and reload files
        setUploading((prev) => prev.filter((name) => name !== file.name));
        await loadUserFiles(userId);

        toast({
          title: "Archivo subido",
          description: `${file.name} se ha subido correctamente`,
        });
      } catch (error: any) {
        console.error("Upload error:", error);
        setUploading((prev) => prev.filter((name) => name !== file.name));
        toast({
          title: "Error de subida",
          description: error.message || `No se pudo subir ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const deleteFile = async (fileItem: FileUploadItem) => {
    if (!userId) return;

    try {
      // Delete from storage
      const bucket = fileItem.storage_path.startsWith("branding/") ? "branding" : "brolls";
      const filePath = fileItem.storage_path.replace(`${bucket}/`, "");

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("branding_assets")
        .delete()
        .eq("id", fileItem.id);

      if (dbError) throw dbError;

      // Reload files
      await loadUserFiles(userId);

      toast({
        title: "Archivo eliminado",
        description: `${fileItem.name} ha sido eliminado`,
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type.startsWith("video/")) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <Card 
        className={`transition-colors duration-200 ${
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-dashed border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-12 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Arrastra archivos aquí o haz clic
          </h3>
          <p className="text-muted-foreground mb-4">
            Logos • Imágenes • Videos (B-rolls)
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Formatos soportados: PNG, JPG, JPEG, MP4, MOV (máximo 200MB)
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
          >
            Seleccionar archivos
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(Array.from(e.target.files));
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Subiendo archivos...</h3>
            <div className="space-y-2">
              {uploading.map((fileName) => (
                <div key={fileName} className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">{fileName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files List */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Archivos subidos</h3>
          {files.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay archivos subidos aún
            </p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {file.type.startsWith("image/") ? "Imagen" : "Video"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;