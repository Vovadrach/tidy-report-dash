import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center bg-card rounded-lg p-8 shadow-md border border-border">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Сторінку не знайдено</p>
        <a href="/" className="text-primary hover:text-primary/80 underline transition-smooth">
          Повернутися на головну
        </a>
      </div>
    </div>
  );
};

export default NotFound;
