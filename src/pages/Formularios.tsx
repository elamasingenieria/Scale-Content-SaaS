import React from "react";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import UGCScriptForm from "./UGCScriptForm";
import SocialLinksForm from "./SocialLinksForm";

const Formularios = () => {
  return (
    <>
      <SEO 
        title="Formularios | UGC Flow"
        description="Completa los formularios de guiones UGC y enlaces de redes sociales para tu campaña"
        canonical="/formularios"
      />
      
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Formularios</h1>
          <p className="text-muted-foreground">
            Completa ambos formularios para configurar tu campaña de videos UGC
          </p>
        </div>

        {/* UGC Script Form Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Formulario UGC Script</CardTitle>
            <CardDescription>
              Información detallada para la producción de tus videos UGC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UGCScriptForm />
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Social Links Form Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Enlaces de Redes Sociales</CardTitle>
            <CardDescription>
              Conecta tus perfiles de redes sociales para análisis y seguimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SocialLinksForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Formularios;