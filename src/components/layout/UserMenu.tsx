import { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import ProfilePictureUpload from './ProfilePictureUpload';

const UserMenu = () => {
  const { profile, loading } = useUserProfile();
  const [showUpload, setShowUpload] = useState(false);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: 'Sesión cerrada exitosamente' });
    } catch (error: any) {
      toast({
        title: 'Error al cerrar sesión',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getInitials = (email?: string, displayName?: string) => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={profile?.avatar_url} 
                alt="Foto de perfil"
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-brand text-white text-xs">
                {getInitials(profile?.email, profile?.display_name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {profile?.email}
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowUpload(true)}>
            <User className="mr-2 h-4 w-4" />
            Cambiar foto de perfil
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/billing">
              Facturación
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfilePictureUpload 
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
      />
    </>
  );
};

export default UserMenu;