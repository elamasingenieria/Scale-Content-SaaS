import React, { useState } from "react";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import UGCScriptFormWizard from "@/components/forms/UGCScriptFormWizard";
import SocialLinksForm from "./SocialLinksForm";

const Formularios = () => {
  const [isUGCFormOpen, setIsUGCFormOpen] = useState(false);
  const [isSocialLinksOpen, setIsSocialLinksOpen] = useState(false);

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
        <Collapsible open={isUGCFormOpen} onOpenChange={setIsUGCFormOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-left space-y-1">
                    <CardTitle className="text-xl">Formulario UGC Script</CardTitle>
                    <CardDescription>
                      Información detallada para la producción de tus videos UGC
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      {isUGCFormOpen ? 'Cerrar' : 'Abrir'}
                    </Button>
                    {isUGCFormOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <UGCScriptFormWizard />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Separator className="my-8" />

        {/* Social Links Form Section */}
        <Collapsible open={isSocialLinksOpen} onOpenChange={setIsSocialLinksOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-left space-y-1">
                    <CardTitle className="text-xl">Enlaces de Redes Sociales</CardTitle>
                    <CardDescription>
                      Conecta tus perfiles de redes sociales para análisis y seguimiento
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      {isSocialLinksOpen ? 'Cerrar' : 'Abrir'}
                    </Button>
                    {isSocialLinksOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <SocialLinksForm />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </>
  );
};

export default Formularios;