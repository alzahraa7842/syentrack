/**
 * Default High-Resolution Responsive Banners for Career Center
 * Categories: Event, Lowongan Kerja, Magang, Beasiswa, Pelatihan
 */

export const DEFAULT_BANNERS = {
  Event: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000',
  'Lowongan Kerja': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
  'Lowongan kerja': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
  Magang: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000',
  Beasiswa: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1000',
  Pelatihan: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1000'
};

export const PRESET_BANNER_OPTIONS = [
  {
    id: 'career_day',
    label: 'Job Fair & Career Expo',
    category: 'Event',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'tech_office',
    label: 'Modern Tech & Corporate Office',
    category: 'Lowongan Kerja',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'team_intern',
    label: 'Collaborative Internship & Mentorship',
    category: 'Magang',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'scholarship_campus',
    label: 'University Campus & Scholarship',
    category: 'Beasiswa',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'workshop_coding',
    label: 'Workshop & Tech Training',
    category: 'Pelatihan',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1000'
  }
];

export function getBannerForJob(category: string, bannerImage?: string): string {
  if (bannerImage && bannerImage.trim()) {
    return bannerImage;
  }
  return (DEFAULT_BANNERS as Record<string, string>)[category] || DEFAULT_BANNERS['Lowongan Kerja'];
}
