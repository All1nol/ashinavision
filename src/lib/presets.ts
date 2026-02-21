export interface Preset {
  id: string;
  label: string;
  latex: string;
}

export const PRESETS: Preset[] = [
  {
    id: "euler",
    label: "Euler's Identity",
    latex: "e^{i\\pi} + 1 = 0",
  },
  {
    id: "quadratic",
    label: "Quadratic Formula",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
  },
  {
    id: "schrodinger",
    label: "Schr\u00F6dinger Equation",
    latex: "i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)",
  },
  {
    id: "gaussian",
    label: "Gaussian Integral",
    latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}",
  },
  {
    id: "mass-energy",
    label: "Mass\u2013Energy Equivalence",
    latex: "E = mc^2",
  },
];
