"use client";

export type AddressMethod = "WHATSAPP" | "EMAIL";

/** Lets someone choose WhatsApp or email, then enter that number or address. */
export function AddressField(props: {
  method: AddressMethod;
  onMethodChange: (method: AddressMethod) => void;
  address: string;
  onAddressChange: (address: string) => void;
}) {
  const { method } = props;
  const options: Array<{ value: AddressMethod; label: string }> = [
    { value: "WHATSAPP", label: "WhatsApp" },
    { value: "EMAIL", label: "Email" },
  ];

  return (
    <>
      <fieldset>
        <legend className="field-label">Send my code by</legend>
        <div className="flex gap-5">
          {options.map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={method === option.value}
                onChange={() => props.onMethodChange(option.value)}
              />
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
