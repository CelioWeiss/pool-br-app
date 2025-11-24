"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wrench, 
  Calendar, 
  ClipboardList, 
  Map, 
  Droplets,
  LogOut,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['master', 'owner', 'technician', 'client'] },
  { href: '/dashboard/franchises', label: 'Franquias', icon: Building2, roles: ['master'] },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users, roles: ['owner'] },
  { href: '/dashboard/technicians', label: 'Técnicos', icon: Wrench, roles: ['owner'] },
  { href: '/dashboard/schedule', label: 'Agenda', icon: Calendar, roles: ['owner', 'technician'] },
  { href: '/dashboard/service-report', label: 'Novo Relatório', icon: ClipboardList, roles: ['technician'] },
  { href: '/dashboard/map', label: 'Mapa', icon: Map, roles: ['master', 'owner', 'technician'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, hasRole, logout } = useAuth();

  if (!user) return null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
            <Droplets className="h-8 w-8 text-white" />
            <h2 className="text-xl font-bold text-white font-headline">Pool BR</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {menuItems.filter(item => hasRole(item.roles)).map(item => (
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
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm truncate">
            <span className="font-semibold text-sidebar-foreground">{user.name}</span>
            <span className="text-xs text-sidebar-foreground/70">{user.role}</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={logout}>
            <LogOut size={18}/>
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}
