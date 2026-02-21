import { ConverterClient } from "@/components/converter-client";

const HomePage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          LaTeX to Accessible HTML
        </h1>
        <p className="mt-2 text-sm text-foreground/60 leading-relaxed max-w-2xl">
          Paste LaTeX math content below and convert it into accessible HTML
          with plain-English descriptions suitable for screen readers.
        </p>
      </div>

      <ConverterClient />
    </div>
  );
};

export default HomePage;
