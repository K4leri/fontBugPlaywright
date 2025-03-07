export type FileType = "приемСтавок" | "ИдетИгра" | "ВыиграшПо" | "37";

// координаты лого при загрузке
export const mainLogo = {
  x: 850,
  y: 370,
  width: 210,
  height: 210,
};

// координаты текста чисел
export const textOnBord = {
  x: 400,
  y: 150,
  width: 160,
  height: 40,
};

// координаты выпадающих чисел
export const numbers = {
  x: 70,
  y: 193,
  width: 130,
  height: 54,
};

export interface Accounts {
  login: string;
  password: string;
}

export interface RestartCallback {
  (threadId: number): Promise<void>;
}
