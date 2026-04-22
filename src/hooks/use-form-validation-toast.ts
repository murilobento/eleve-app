"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { FieldErrors, FieldValues, UseFormReturn } from "react-hook-form";

export const TOAST_VALIDATION_FORM_CLASSNAME =
  "[&_[data-slot=form-message]]:hidden [&_[data-slot=form-label][data-error=true]]:text-foreground";

function collectMessages(errors: unknown, touchedFields?: unknown) {
  const messages: string[] = [];

  const visit = (errorValue: unknown, touchedValue: unknown, touchedAncestor = false) => {
    if (!errorValue || typeof errorValue !== "object") {
      return;
    }

    const isTouched = touchedAncestor || touchedValue === true;

    if ("message" in errorValue && typeof errorValue.message === "string" && errorValue.message.trim()) {
      if (touchedFields === undefined || isTouched) {
        messages.push(errorValue.message.trim());
      }
    }

    if (Array.isArray(errorValue)) {
      errorValue.forEach((item, index) => {
        visit(item, Array.isArray(touchedValue) ? touchedValue[index] : undefined, isTouched);
      });
      return;
    }

    Object.entries(errorValue).forEach(([key, value]) => {
      // Skip react-hook-form internal leaf keys to avoid recursing into
      // DOM elements (ref) which contain circular references.
      if (key === "message" || key === "type" || key === "ref" || key === "root") {
        return;
      }

      const nextTouched =
        touchedValue && typeof touchedValue === "object" && !Array.isArray(touchedValue)
          ? (touchedValue as Record<string, unknown>)[key]
          : undefined;
      visit(value, nextTouched, isTouched);
    });
  };

  visit(errors, touchedFields);

  return Array.from(new Set(messages));
}

export function collectErrorMessages(errors: unknown) {
  return collectMessages(errors);
}

export function useFormValidationToast<TFieldValues extends FieldValues>({
  form,
  title,
  fallback,
  maxVisibleMessages = 4,
  enableBlur = true,
}: {
  form: UseFormReturn<TFieldValues>;
  title: string;
  fallback: string;
  maxVisibleMessages?: number;
  enableBlur?: boolean;
}) {
  const previousSubmitCountRef = useRef(form.formState.submitCount);
  const previousBlurSignatureRef = useRef("");

  useEffect(() => {
    if (!enableBlur) {
      return;
    }

    const touchedMessages = collectMessages(form.formState.errors, form.formState.touchedFields);
    const signature = touchedMessages.join("||");

    if (form.formState.submitCount !== previousSubmitCountRef.current) {
      previousSubmitCountRef.current = form.formState.submitCount;
      previousBlurSignatureRef.current = signature;
      return;
    }

    if (!signature || signature === previousBlurSignatureRef.current) {
      previousBlurSignatureRef.current = signature;
      return;
    }

    previousBlurSignatureRef.current = signature;
    toast.error(title, {
      description: touchedMessages[0] ?? fallback,
    });
  }, [enableBlur, fallback, form.formState.errors, form.formState.submitCount, form.formState.touchedFields, title]);

  const handleInvalidSubmit = useCallback((errors: FieldErrors<TFieldValues>) => {
    const messages = collectMessages(errors);
    const visibleMessages = messages.slice(0, maxVisibleMessages);
    const remainingCount = messages.length - visibleMessages.length;

    toast.error(title, {
      description: visibleMessages.length
        ? `${visibleMessages.join(" • ")}${remainingCount > 0 ? ` • +${remainingCount}` : ""}`
        : fallback,
    });
  }, [fallback, maxVisibleMessages, title]);

  return {
    formClassName: TOAST_VALIDATION_FORM_CLASSNAME,
    handleInvalidSubmit,
  };
}
