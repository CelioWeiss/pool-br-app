
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wrench, 
  Calendar, 
  Map, 
  LogOut,
  FileText,
  BookOpen,
  QrCode,
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['master', 'owner', 'technician', 'client'] },
  { href: '/dashboard/franchises', label: 'Franquias', icon: Building2, roles: ['master'] },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users, roles: ['owner'] },
  { href: '/dashboard/technicians', label: 'Técnicos', icon: Wrench, roles: ['owner'] },
  { href: '/dashboard/quotes', label: 'Orçamentos', icon: FileText, roles: ['master', 'owner'] },
  { href: '/dashboard/accounts-receivable', label: 'Contas a Receber', icon: DollarSign, roles: ['owner'] },
  { href: '/dashboard/schedule', label: 'Agenda', icon: Calendar, roles: ['owner', 'technician'] },
  { href: '/dashboard/scanner', label: 'Escanear QR Code', icon: QrCode, roles: ['technician'] },
  { href: '/dashboard/university', label: 'Universidade', icon: BookOpen, roles: ['master', 'owner', 'technician'] },
  // { href: '/dashboard/map', label: 'Mapa', icon: Map, roles: ['master', 'owner'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { userInfo, logout, hasRole } = useAuth();
  const logo = PlaceHolderImages.find(p => p.id === 'logo-white');

  const filteredMenu = React.useMemo(() => {
    return menuItems.filter(item => hasRole(item.roles))
  }, [hasRole]);

  if (!userInfo) return null;

  return (
    <Sidebar>
       <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
            {logo && (
              <Image
                src={logo.imageUrl} 
                alt="Pool BR Logo"
                width={32}
                height={32}
                className="object-contain"
                data-ai-logo
              />
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">Pool BR</span>
              <span className="text-xs text-sidebar-foreground/70 -mt-1">Limpeza e Manutenção</span>
            </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {filteredMenu.map(item => (
             <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={userInfo.avatarUrl} alt={userInfo.firstName} />
            <AvatarFallback>{userInfo.firstName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm truncate">
            <span className="font-semibold text-sidebar-foreground">{userInfo.firstName} {userInfo.lastName}</span>
            <span className="text-xs text-sidebar-foreground/70">{userInfo.role}</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={logout}>
            <LogOut size={18}/>
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}
