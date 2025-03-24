import { cn } from "@/lib/utils";
import React from "react";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: "default" | "sm" | "lg" | "xl" | "full";
  className?: string;
}

export default function Container({
  children,
  size = "default",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6",
        {
          "max-w-screen-sm": size === "sm",
          "max-w-screen-lg": size === "lg",
          "max-w-screen-xl": size === "xl",
          "max-w-7xl": size === "default",
          "max-w-full": size === "full",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  className?: string;
  hideTitle?: boolean;
}

export function PageContainer({
  children,
  title,
  className,
  hideTitle = false,
  ...props
}: PageContainerProps) {
  return (
    <Container className={cn("py-6", className)} {...props}>
      {title && !hideTitle && (
        <h1 className="text-2xl font-bold mb-6 md:text-3xl">{title}</h1>
      )}
      {children}
    </Container>
  );
}

interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  icon?: React.ReactNode;
}

export function SectionContainer({
  children,
  title,
  description,
  className,
  titleClassName,
  icon,
  ...props
}: SectionContainerProps) {
  return (
    <section className={cn("mb-8", className)} {...props}>
      {title && (
        <h2 className={cn("text-xl font-semibold mb-2", titleClassName)}>
          {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
          {title}
        </h2>
      )}
      {description && (
        <p className="text-muted-foreground mb-4">{description}</p>
      )}
      {children}
    </section>
  );
} 