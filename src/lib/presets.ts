export interface Preset {
  id: string;
  label: string;
  latex: string;
}

export const PRESETS: Preset[] = [
  {
    id: "gauss-law",
    label: "Gauss's Law (Maxwell)",
    latex: "\\oiint \\vec{E} \\cdot d\\vec{S} = \\frac{1}{\\epsilon_0} \\iiint \\varrho \\, dV",
  },
  {
    id: "relativistic-energy",
    label: "Relativistic Energy",
    latex: "E = \\frac{mc^2}{\\sqrt{1 - \\frac{v^2}{c^2}}} \\stackrel{v=0}{=} mc^2",
  },
  {
    id: "time-dilation",
    label: "Time Dilation",
    latex: "\\Delta t' = \\frac{\\Delta t}{\\sqrt{1 - \\frac{v^2}{c^2}}}",
  },
  {
    id: "length-contraction",
    label: "Length Contraction",
    latex: "L' = L \\sqrt{1 - \\frac{v^2}{c^2}}",
  },
  {
    id: "rotation-matrix",
    label: "3D Rotation Matrix",
    latex: "D = \\begin{pmatrix} \\cos\\theta & \\sin\\theta & 0 \\\\ -\\sin\\theta & \\cos\\theta & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}",
  },
  {
    id: "lorentz-transform",
    label: "Lorentz Transformation",
    latex: "x'^{\\nu} = \\sum_{\\mu=0}^{3} \\Lambda^{\\nu}_{\\;\\mu} \\, x^{\\mu}",
  },
  {
    id: "spherical-integral",
    label: "Spherical Triple Integral",
    latex: "\\int_{R_i}^{R_f} \\int_0^{2\\pi} \\int_0^{\\pi} \\varrho(r, \\varphi, \\theta) \\, r^2 \\sin\\theta \\, dr \\, d\\varphi \\, d\\theta",
  },
];
