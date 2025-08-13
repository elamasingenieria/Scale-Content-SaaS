import React from "react";
import SEO from "@/components/SEO";
import FileUpload from "@/components/branding/FileUpload";

const Branding = () => {
  return (
    <>
      <SEO
        title="Assets de Marca | UGC Flow"
        description="Sube tus logos, imágenes y videos B-roll para personalizar tus campañas UGC"
        canonical="/branding"
      />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Assets de Marca</h1>
          <p className="text-muted-foreground">
            Sube tus logos, imágenes y videos B-roll para personalizar tus videos UGC
          </p>
        </div>

        {/* File Upload Component */}
        <FileUpload />
      </div>
    </>
  );
};

export default Branding;
