import { ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const NavigationButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Робочі дні" },
    { path: "/reports-status", label: "Статус клієнтів" },
    { path: "/create-report", label: "Створити звіт" },
    { path: "/dashboard", label: "Аналітика" },
  ];

  const currentPage = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-effect px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-smooth group">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-foreground text-sm">{currentPage.label}</span>
            <ChevronDown className="w-4 h-4 text-primary group-hover:text-primary/80 transition-smooth" />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-md">
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`cursor-pointer ${location.pathname === item.path ? 'bg-primary/10' : ''}`}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
