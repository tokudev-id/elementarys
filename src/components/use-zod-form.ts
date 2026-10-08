"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type FormErrorItem = {
  field: string;
  label?: string;
  message: string;
};

export type ZodLikeSchema<TOutput> = {
  safeParse: (data: unknown) =>
    | { success: true; data: TOutput }
    | {
        success: false;
        error: {
          issues: Array<{
            path: PropertyKey[];
            message: string;
          }>;
        };
      };
};

export type UseZodFormOptions<TOutput, TInput = TOutput> = {
  defaultValues?: Partial<TInput>;
  serverErrors?: Record<string, string[]>;
  onSubmit: (values: TOutput) => Promise<unknown> | unknown;
};

export function useZodForm<TOutput = unknown, TInput = Record<string, unknown>>(
  schema: ZodLikeSchema<TOutput>,
  options: UseZodFormOptions<TOutput, TInput>,
) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const initialValues = (options.defaultValues as Record<string, unknown>) ?? {};
  const valuesRef = useRef<Record<string, unknown>>(initialValues);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errorSummary, setErrorSummary] = useState<FormErrorItem[]>([]);

  // Sync server errors when they change
  useEffect(() => {
    if (!options.serverErrors || Object.keys(options.serverErrors).length === 0)
      return;
    const mapped: Record<string, string> = {};
    const summary: FormErrorItem[] = [];
    for (const [key, msgs] of Object.entries(options.serverErrors)) {
      if (msgs && msgs.length > 0) {
        mapped[key] = msgs[0];
        summary.push({ field: key, message: msgs[0] });
      }
    }
    queueMicrotask(() => {
      setErrors((prev) => ({ ...prev, ...mapped }));
      if (summary.length >= 3) {
        setErrorSummary(summary);
      }
    });
    // Focus first server error
    const firstKey = Object.keys(mapped)[0];
    if (firstKey && formRef.current) {
      const el = formRef.current.querySelector<HTMLElement>(
        `[name="${firstKey}"]`,
      );
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [options.serverErrors]);

  const validateField = useCallback(
    (name: string, currentValues: Record<string, unknown>) => {
      const result = schema.safeParse(currentValues);
      if (result.success) {
        setErrors((prev) => {
          if (!prev[name]) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        });
        return null;
      }
      const fieldIssue = result.error.issues.find(
        (issue) => String(issue.path[0]) === name,
      );
      if (fieldIssue) {
        setErrors((prev) => ({ ...prev, [name]: fieldIssue.message }));
        return fieldIssue.message;
      } else {
        setErrors((prev) => {
          if (!prev[name]) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        });
        return null;
      }
    },
    [schema],
  );

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      setIsDirty(true);
      valuesRef.current = { ...valuesRef.current, [name]: value };
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        if (touched[name] || errors[name]) {
          validateField(name, next);
        }
        return next;
      });
    },
    [touched, errors, validateField],
  );

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      validateField(name, valuesRef.current);
    },
    [validateField],
  );

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      setIsSubmitting(true);

      const currentValues = valuesRef.current;
      const result = schema.safeParse(currentValues);

      if (!result.success) {
        const newErrors: Record<string, string> = {};
        const summary: FormErrorItem[] = [];
        const newTouched: Record<string, boolean> = {};

        for (const issue of result.error.issues) {
          const fieldName = String(issue.path[0] ?? "");
          if (fieldName && !newErrors[fieldName]) {
            newErrors[fieldName] = issue.message;
            summary.push({ field: fieldName, message: issue.message });
            newTouched[fieldName] = true;
          }
        }

        setErrors(newErrors);
        setTouched((prev) => ({ ...prev, ...newTouched }));
        setErrorSummary(summary.length >= 3 ? summary : []);

        // Focus & scroll to first error
        if (summary.length > 0 && formRef.current) {
          const firstField = summary[0].field;
          const firstEl = formRef.current.querySelector<HTMLElement>(
            `[name="${firstField}"]`,
          );
          if (firstEl) {
            firstEl.focus();
            firstEl.scrollIntoView({ block: "nearest" });
          }
        }

        setIsSubmitting(false);
        return;
      }

      setErrors({});
      setErrorSummary([]);

      try {
        await options.onSubmit(result.data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [schema, options],
  );

  const setValue = useCallback(
    (name: string, val: unknown) => {
      handleChange(name, val);
    },
    [handleChange],
  );

  const setError = useCallback((name: string, message: string) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const clearErrors = useCallback((name?: string) => {
    if (name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } else {
      setErrors({});
      setErrorSummary([]);
    }
  }, []);

  const reset = useCallback(
    (newValues?: Partial<TInput>) => {
      const v = (newValues as Record<string, unknown>) ?? {};
      valuesRef.current = v;
      setValues(v);
      setErrors({});
      setTouched({});
      setIsDirty(false);
      setErrorSummary([]);
    },
    [],
  );

  const register = useCallback(
    (name: string) => {
      const fieldId = `${formId}-${name}`;
      return {
        name,
        id: fieldId,
        value: (values[name] as string | number | undefined) ?? "",
        onChange: (
          e: ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >,
        ) => {
          const val =
            e.target.type === "checkbox"
              ? (e.target as HTMLInputElement).checked
              : e.target.value;
          handleChange(name, val);
        },
        onBlur: () => handleBlur(name),
        error: errors[name],
      };
    },
    [formId, values, errors, handleChange, handleBlur],
  );

  return {
    formRef,
    formProps: {
      noValidate: true,
      onSubmit: handleSubmit,
      ref: formRef,
    },
    values: values as Partial<TInput>,
    errors,
    touched,
    isSubmitting,
    isDirty,
    errorSummary,
    register,
    setValue,
    setError,
    clearErrors,
    reset,
    handleSubmit,
  };
}
