/** Reference points used by the boundary tests. [lng, lat] */
export const MUST_BE_INDIA: Record<string, [number, number]> = {
  "Muzaffarabad (PoJK)": [73.47, 34.37],
  "Mirpur (PoJK)": [73.75, 33.15],
  "Kotli (PoJK)": [73.9, 33.52],
  "Gilgit (Gilgit-Baltistan)": [74.31, 35.92],
  "Skardu (Gilgit-Baltistan)": [75.63, 35.3],
  "Hunza (Gilgit-Baltistan)": [74.66, 36.32],
  "Aksai Chin": [79.5, 35.2],
  "Aksai Chin south": [79.0, 34.6],
  "Shaksgam Valley": [76.5, 36.0],
  Srinagar: [74.8, 34.08],
  Leh: [77.58, 34.16],
};
export const MUST_NOT_BE_INDIA: Record<string, [number, number]> = {
  Lahore: [74.35, 31.55],
  Islamabad: [73.05, 33.69],
  Kashgar: [75.99, 39.47],
  Peshawar: [71.58, 34.01],
};
