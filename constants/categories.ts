// Mock Categories Data
export const CATEGORIES = [
  {
    id: 1,
    name: "A2 Milk",
    image: "https://placehold.co/100x100/F5F5F0/101B53.png?text=Milk",
  },
  {
    id: 2,
    name: "Buffalo Milk",
    image: "https://placehold.co/100x100/F5F5F0/101B53.png?text=Buffalo",
  },
  {
    id: 3,
    name: "Ghee",
    image: "https://placehold.co/100x100/F5F5F0/101B53.png?text=Ghee",
  },
  {
    id: 4,
    name: "Paneer",
    image: "https://placehold.co/100x100/F5F5F0/101B53.png?text=Paneer",
  },
]

export interface Category {
  id: number
  name: string
  image: string
}
