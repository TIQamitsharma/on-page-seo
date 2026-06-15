import {
  Search,
  LayoutDashboard,
  Palette,
  Key,
  Triangle,
  History,
  FileText,
  Settings,
  User,
  Monitor,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  teams: [
    {
      name: 'OnPageSEO',
      logo: Triangle,
      plan: 'SEO Analysis Tool',
    },
  ],
  navGroups: [
    {
      title: 'SEO Tools',
      items: [
        {
          title: 'New Audit',
          url: '/',
          icon: Search,
        },
        {
          title: 'Dashboard',
          url: '/audits',
          icon: LayoutDashboard,
        },
        {
          title: 'Audit History',
          url: '/history',
          icon: History,
        },
        {
          title: 'Reports',
          url: '/reports',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'API Keys',
          url: '/settings/api-keys',
          icon: Key,
        },
        {
          title: 'Appearance',
          url: '/settings/appearance',
          icon: Palette,
        },
        {
          title: 'Account',
          url: '/settings/account',
          icon: User,
        },
        {
          title: 'Display',
          url: '/settings/display',
          icon: Monitor,
        },
        {
          title: 'All Settings',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
