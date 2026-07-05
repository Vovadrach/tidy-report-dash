import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  LogOut,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const TopNavigation = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Вихід успішний");
      navigate("/login");
    } catch (error) {
      toast.error("Помилка виходу");
      console.error(error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/10 transition-all"
                onClick={() => setIsOpen(!isOpen)}
              >
                <Menu className="h-6 w-6 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="mt-2 rounded-xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] p-2"
              onCloseAutoFocus={(e) => e.preventDefault()}
              sideOffset={8}
            >
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 focus:bg-gradient-to-r focus:from-red-500/20 focus:to-red-600/20 focus:text-destructive transition-all duration-200"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Вийти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-light tracking-wide text-foreground">
            Pulizia apartamenti
          </h1>

          <div className="w-10"></div>
        </div>
      </div>
    </div>
  );
};