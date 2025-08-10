import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-4">Oops! Página no encontrada</p>
        <a href="/" className="underline underline-offset-4 text-brand">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
