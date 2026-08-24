// src/lib/types.ts

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  timestamp: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon: string;
  rainChance: number;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  rainChance: number;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  pressure: number;
  condition: string;
  conditionIcon: string;
  conditionEmoji: string;
  uvIndex: number;
  uvLevel: string;
  aqi: number;
  aqiLevel: string;
  aqiColor: string;
  aqiAdvice: string;
  sunrise: string;
  sunset: string;
  hourlyForecast: HourlyForecast[];
  dailyForecast: DailyForecast[];
  timestamp: number;
}
