'use client';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import Logo from '../../../public/cypresslogo.svg';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';

const routes = [
  { title: 'Features', href: '#features' },
  { title: 'Testimonials', href: '#testimonials' },
  { title: 'Pricing', href: '#pricing' },
];

const Header = () => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const targetSection = document.getElementById(targetId);

    if (targetSection) {
      const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset  - 100 ;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1500; // milliseconds
      let start: number | null = null;

      const animation = (currentTime: number) => {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const progress = Math.min(timeElapsed / duration, 1);

        // Easing function for smooth animation (easeInOutCubic)
        const easeInOutCubic =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, startPosition + distance * easeInOutCubic);

        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    }
  };

  return (
    <header
      className="p-4
      flex
      justify-center
      items-center
      sticky
      top-0
      z-50
      bg-background/95
      backdrop-blur
      supports-[backdrop-filter]:bg-background/60
  "
    >
      <Link
        href={'/'}
        className="w-full flex gap-2
        justify-left items-center"
      >
        <Image
          src={Logo}
          alt="Cypress Logo"
          width={25}
          height={25}
        />
        <span
          className="font-semibold
          dark:text-white
        "
        >
          cypress.
        </span>
      </Link>
      <nav className="hidden md:flex gap-6 items-center">
        {routes.map((route) => (
          <a
            key={route.title}
            href={route.href}
            onClick={(e) => handleScroll(e, route.href)}
            className="flex items-center gap-1 text-xl font-normal dark:text-white/70 hover:dark:text-white transition-colors"
          >
            {route.title}
            <ChevronDown className="h-4 w-4" />
          </a>
        ))}
      </nav>
      <aside
        className="flex
        w-full
        gap-2
        justify-end
      "
      >
        <Link href={'/login'} className="hidden sm:block">
          <Button
            variant="btn-secondary"
            className="p-1 cursor-pointer"
          >
            Login
          </Button>
        </Link>
        <Link href="/signup">
          <Button
            variant="btn-primary"
            className="whitespace-nowrap cursor-pointer"
          >
            Sign Up
          </Button>
        </Link>
      </aside>
    </header>
  );
};

export default Header;
