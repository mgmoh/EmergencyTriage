import * as React from "react"
import { useToast as useToastPrimitive } from "@/components/ui/toast"

export function useToast() {
  const { toast } = useToastPrimitive()
  return { toast }
} 