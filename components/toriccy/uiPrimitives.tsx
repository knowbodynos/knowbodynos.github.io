'use client'

import * as React from 'react'

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  title,
  children,
  className,
}: {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm',
        'dark:border-gray-800 dark:bg-gray-950',
        className
      )}
    >
      <div className="mb-3 font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      {children}
    </div>
  )
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={cx(
        'inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold',
        'border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800',
        className
      )}
    />
  )
})

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">{children}</div>
  )
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cx(
        'w-full rounded-xl border px-3 py-2 text-sm',
        'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400',
        'focus:ring-2 focus:ring-gray-200 focus:outline-none',
        'dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-gray-800',
        className
      )}
    />
  )
})

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cx(
        'w-full rounded-xl border px-3 py-2 text-sm',
        'border-gray-200 bg-white text-gray-900',
        'focus:ring-2 focus:ring-gray-200 focus:outline-none',
        'dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-800',
        className
      )}
    />
  )
})
