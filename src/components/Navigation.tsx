import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Plus, 
  Users,
  Menu,
  LogOut
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Navigation = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

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
    <>
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="rounded-full hover:bg-primary/10 transition-all"
                >
                  <Menu className="h-6 w-6 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="mt-2 rounded-lg border border-border/50 bg-background/90 backdrop-blur-lg"
              >
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer rounded-md hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Вийти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white h-12 w-12 shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate("/dashboard")}
            >
              <BarChart3 className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-blue-500 hover:bg-blue-600 text-white h-14 w-14 shadow-md hover:shadow-lg transition-all -translate-y-4"
              onClick={() => navigate("/create-report")}
            >
              <Plus className="h-7 w-7" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white h-12 w-12 shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate("/reports-status")}
            >
              <Users className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};