"use client";

import { Mail, MessageCircle } from "lucide-react";

export type AddressMethod = "WHATSAPP" | "EMAIL";

/** Lets someone choose WhatsApp or email, then enter that number or address. */
export function AddressField(props: {
  method: AddressMethod;
  onMethodChange: (method: AddressMethod) => void;
  address: string;
  onAddressChange: (address: string) => void;
}) {
  const { method } = props;
  const options = [
    { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
    { value: "EMAIL", label: "Email", icon: Mail },
  ] as const;

  return (
    <>
      <fieldset>
        <legend className="field-label">Send my code by</legend>
        {/* A two-way toggle; the radios stay in the page for keyboards and screen readers. */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition hover:text-slate-900 has-checked:bg-white has-checked:text-brand-800 has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-brand-700/40"
            >
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={method === option.value}
                onChange={() => props.onMethodChange(option.value)}
                className="sr-only"
              />
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="address" className="field-label">
          {method === "EMAIL" ? "Email address" : "WhatsApp number"}
        </label>
        <input
          id="address"
          required
          type={method === "EMAIL" ? "email" : "tel"}
          autoComplete={method === "EMAIL" ? "email" : "tel"}
          placeholder={method === "EMAIL" ? "you@example.com" : "077 123 4567"}
          value={props.address}
          onChange={(event) => props.onAddressChange(event.target.value)}
          className="field-input"
        />
      </div>
    </>
  );
}
