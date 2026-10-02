/**
 * My Town: what each slot costs, what it is called, and what it looks like.
 *
 * The three live together on purpose. The name has to agree with the picture and
 * the slot has to mean the same role in every language, and the only way any of
 * that is reliably true is if there is one table to change. Split across
 * `art.ts` and the screen, the cost ladder sat in one file, the pictures in
 * another, and a rename could move one without the others — which is how seven
 * asset paths were left pointing at files a rename had already deleted.
 *
 * **The name is in the language being learned, not the interface's.** A Goethe
 * learner is building a German town; showing them "Civic hall" describes the app
 * to itself rather than the place they are in. The slot keys stay neutral
 * ("assemblyHall", not "temple") because they are the identity a language
 * matches on, and every one of these has a counterpart in all four courses.
 */
import type { ImageSourcePropType } from "react-native"
import type { LanguageCode } from "@/lib/languages"
import type { ScriptPref } from "@/store/onboarding"

export type TownSlot =
  | "assemblyHall"
  | "cafeGarden"
  | "foodShop"
  | "gardenPavilion"
  | "oldStreet"
  | "riversideWalk"
  | "monument"
  | "hilltopLandmark"
  | "marketSquare"
  | "civicHall"

/** What each slot costs, in XP. Same in every language — the ladder is the progression. */
const COST: Record<TownSlot, number> = {
  assemblyHall: 0,
  cafeGarden: 300,
  foodShop: 700,
  gardenPavilion: 1200,
  oldStreet: 1800,
  riversideWalk: 2500,
  monument: 3300,
  hilltopLandmark: 4200,
  marketSquare: 5200,
  civicHall: 6500,
}

type Names = Record<TownSlot, string>

/**
 * Chinese carries both scripts.
 *
 * Noto Serif SC and TC draw many shared codepoints differently, so a TOCFL
 * learner shown 灯笼街 in a mainland face is looking at a different building's
 * sign. Every other language writes its names the one way it has them.
 */
const NAMES: {
  zh: { simplified: Names; traditional: Names }
  ja: Names
  de: Names
  en: Names
} = {
  zh: {
    simplified: {
      assemblyHall: "佛殿",
      cafeGarden: "茶馆",
      foodShop: "面馆",
      gardenPavilion: "水榭",
      oldStreet: "灯笼街",
      riversideWalk: "河畔小径",
      monument: "佛像",
      hilltopLandmark: "宝塔",
      marketSquare: "集市",
      civicHall: "正殿",
    },
    traditional: {
      assemblyHall: "佛殿",
      cafeGarden: "茶館",
      foodShop: "麵館",
      gardenPavilion: "水榭",
      oldStreet: "燈籠街",
      riversideWalk: "河畔小徑",
      monument: "佛像",
      hilltopLandmark: "寶塔",
      marketSquare: "集市",
      civicHall: "正殿",
    },
  },
  ja: {
    assemblyHall: "神社",
    cafeGarden: "茶屋",
    foodShop: "ラーメン屋",
    gardenPavilion: "石庭の東屋",
    oldStreet: "提灯の路",
    riversideWalk: "川沿いの小径",
    monument: "地蔵",
    hilltopLandmark: "山の神社",
    marketSquare: "市場",
    civicHall: "城門",
  },
  de: {
    assemblyHall: "Dorfkirche",
    cafeGarden: "Biergarten",
    foodShop: "Bäckerei",
    gardenPavilion: "Parkpavillon",
    oldStreet: "Marktstraße",
    riversideWalk: "Rheinufer",
    monument: "Denkmal",
    hilltopLandmark: "Bergkapelle",
    marketSquare: "Marktplatz",
    civicHall: "Schloss",
  },
  en: {
    assemblyHall: "Library",
    cafeGarden: "Corner cafe",
    foodShop: "Diner",
    gardenPavilion: "Bandstand",
    oldStreet: "Main Street",
    riversideWalk: "Riverside Walk",
    monument: "Monument",
    hilltopLandmark: "Lighthouse",
    marketSquare: "Market Square",
    civicHall: "Capitol",
  },
}

const ART: Record<LanguageCode, Record<TownSlot, ImageSourcePropType>> = {
  zh: {
    assemblyHall: require("@assets/study-art/buildings/zh/assembly-hall.png"),
    cafeGarden: require("@assets/study-art/buildings/zh/cafe-garden.png"),
    foodShop: require("@assets/study-art/buildings/zh/food-shop.png"),
    gardenPavilion: require("@assets/study-art/buildings/zh/garden-pavilion.png"),
    oldStreet: require("@assets/study-art/buildings/zh/old-street.png"),
    riversideWalk: require("@assets/study-art/buildings/zh/riverside-walk.png"),
    monument: require("@assets/study-art/buildings/zh/monument.png"),
    hilltopLandmark: require("@assets/study-art/buildings/zh/hilltop-landmark.png"),
    marketSquare: require("@assets/study-art/buildings/zh/market-square.png"),
    civicHall: require("@assets/study-art/buildings/zh/civic-hall.png"),
  },
  ja: {
    assemblyHall: require("@assets/study-art/buildings/ja/assembly-hall.png"),
    cafeGarden: require("@assets/study-art/buildings/ja/cafe-garden.png"),
    foodShop: require("@assets/study-art/buildings/ja/food-shop.png"),
    gardenPavilion: require("@assets/study-art/buildings/ja/garden-pavilion.png"),
    oldStreet: require("@assets/study-art/buildings/ja/old-street.png"),
    riversideWalk: require("@assets/study-art/buildings/ja/riverside-walk.png"),
    monument: require("@assets/study-art/buildings/ja/monument.png"),
    hilltopLandmark: require("@assets/study-art/buildings/ja/hilltop-landmark.png"),
    marketSquare: require("@assets/study-art/buildings/ja/market-square.png"),
    civicHall: require("@assets/study-art/buildings/ja/civic-hall.png"),
  },
  de: {
    assemblyHall: require("@assets/study-art/buildings/de/assembly-hall.png"),
    cafeGarden: require("@assets/study-art/buildings/de/cafe-garden.png"),
    foodShop: require("@assets/study-art/buildings/de/food-shop.png"),
    gardenPavilion: require("@assets/study-art/buildings/de/garden-pavilion.png"),
    oldStreet: require("@assets/study-art/buildings/de/old-street.png"),
    riversideWalk: require("@assets/study-art/buildings/de/riverside-walk.png"),
    monument: require("@assets/study-art/buildings/de/monument.png"),
    hilltopLandmark: require("@assets/study-art/buildings/de/hilltop-landmark.png"),
    marketSquare: require("@assets/study-art/buildings/de/market-square.png"),
    civicHall: require("@assets/study-art/buildings/de/civic-hall.png"),
  },
  en: {
    assemblyHall: require("@assets/study-art/buildings/en/assembly-hall.png"),
    cafeGarden: require("@assets/study-art/buildings/en/cafe-garden.png"),
    foodShop: require("@assets/study-art/buildings/en/food-shop.png"),
    gardenPavilion: require("@assets/study-art/buildings/en/garden-pavilion.png"),
    oldStreet: require("@assets/study-art/buildings/en/old-street.png"),
    riversideWalk: require("@assets/study-art/buildings/en/riverside-walk.png"),
    monument: require("@assets/study-art/buildings/en/monument.png"),
    hilltopLandmark: require("@assets/study-art/buildings/en/hilltop-landmark.png"),
    marketSquare: require("@assets/study-art/buildings/en/market-square.png"),
    civicHall: require("@assets/study-art/buildings/en/civic-hall.png"),
  },
}

/** XP each slot costs. The ladder is the progression, so it is the one thing
 *  here that does not vary by language. */
export const townCost = COST

export interface TownBuilding {
  id: TownSlot
  name: string
  source: ImageSourcePropType
  xpCost: number
}

/** The town, cheapest first. `script` only matters to Chinese. */
export function townFor(
  language: LanguageCode,
  script: ScriptPref
): TownBuilding[] {
  const names =
    language === "zh"
      ? script === "traditional"
        ? NAMES.zh.traditional
        : NAMES.zh.simplified
      : NAMES[language]
  const art = ART[language]
  return (Object.keys(COST) as TownSlot[])
    .map((id) => ({
      id,
      name: names[id],
      source: art[id],
      xpCost: COST[id],
    }))
    .sort((a, b) => a.xpCost - b.xpCost)
}
