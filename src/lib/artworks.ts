import { Artwork } from '@/types'

const W = 'https://upload.wikimedia.org/wikipedia/commons'

export const ARTWORKS: Artwork[] = [
  {
    id: 'starry-night', type: 'painting', wikiTitle: 'The_Starry_Night',
    title: 'The Starry Night', artist: 'Vincent van Gogh', year: '1889', medium: 'Oil on canvas',
    widthCm: 92, heightCm: 73,
    thumb: `${W}/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/330px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg`,
    image: `${W}/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1600px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg`,
  },
  {
    id: 'great-wave', type: 'painting', wikiTitle: 'The_Great_Wave_off_Kanagawa',
    title: 'The Great Wave', artist: 'Katsushika Hokusai', year: '1831', medium: 'Woodblock print',
    widthCm: 38, heightCm: 26,
    thumb: `${W}/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/330px-Tsunami_by_hokusai_19th_century.jpg`,
    image: `${W}/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1600px-Tsunami_by_hokusai_19th_century.jpg`,
  },
  {
    id: 'pearl-earring', type: 'painting', wikiTitle: 'Girl_with_a_Pearl_Earring',
    title: 'Girl with a Pearl Earring', artist: 'Johannes Vermeer', year: '1665', medium: 'Oil on canvas',
    widthCm: 39, heightCm: 44,
    thumb: `${W}/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/330px-1665_Girl_with_a_Pearl_Earring.jpg`,
    image: `${W}/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/1600px-1665_Girl_with_a_Pearl_Earring.jpg`,
  },
  {
    id: 'mona-lisa', type: 'painting', wikiTitle: 'Mona_Lisa',
    title: 'Mona Lisa', artist: 'Leonardo da Vinci', year: '~1517', medium: 'Oil on poplar',
    widthCm: 53, heightCm: 77,
    thumb: `${W}/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/330px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg`,
    image: `${W}/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/1600px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg`,
  },
  {
    id: 'birth-venus', type: 'painting', wikiTitle: 'The_Birth_of_Venus',
    title: 'The Birth of Venus', artist: 'Sandro Botticelli', year: '1485', medium: 'Tempera on canvas',
    widthCm: 278, heightCm: 172,
    thumb: `${W}/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/330px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg`,
    image: `${W}/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1600px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg`,
  },
  {
    id: 'liberty', type: 'painting', wikiTitle: 'Liberty_Leading_the_People',
    title: 'Liberty Leading the People', artist: 'Eugène Delacroix', year: '1830', medium: 'Oil on canvas',
    widthCm: 325, heightCm: 260,
    thumb: `${W}/thumb/0/02/La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg/330px-La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg`,
    image: `${W}/thumb/0/02/La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg/1600px-La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg`,
  },
  {
    id: 'grande-jatte', type: 'painting', wikiTitle: 'A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte',
    title: 'La Grande Jatte', artist: 'Georges Seurat', year: '1886', medium: 'Oil on canvas',
    widthCm: 308, heightCm: 207,
    thumb: `${W}/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/330px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg`,
    image: `${W}/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/1600px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg`,
  },
  {
    id: 'gleaners', type: 'painting', wikiTitle: 'The_Gleaners',
    title: 'The Gleaners', artist: 'Jean-François Millet', year: '1857', medium: 'Oil on canvas',
    widthCm: 111, heightCm: 84,
    thumb: `${W}/thumb/1/1f/Jean-Fran%C3%A7ois_Millet_-_Gleaners_-_Google_Art_Project_2.jpg/330px-Jean-Fran%C3%A7ois_Millet_-_Gleaners_-_Google_Art_Project_2.jpg`,
    image: `${W}/thumb/1/1f/Jean-Fran%C3%A7ois_Millet_-_Gleaners_-_Google_Art_Project_2.jpg/1600px-Jean-Fran%C3%A7ois_Millet_-_Gleaners_-_Google_Art_Project_2.jpg`,
  },
  {
    id: 'bronze-helix', type: 'sculpture',
    title: 'Rising Helix', artist: 'ArtPiq Studio', year: '2024', medium: 'Bronze (3D)',
    widthCm: 20, heightCm: 42,
    description: 'A double helix in aged bronze rising from a white marble plinth. Symbolises growth and duality.',
    image: null, thumb: null,
  },
  {
    id: 'obsidian-form', type: 'sculpture',
    title: 'Obsidian Form No. 3', artist: 'ArtPiq Studio', year: '2024', medium: 'Obsidian glass (3D)',
    widthCm: 15, heightCm: 28,
    description: 'A faceted abstract form in deep obsidian glass. Each face catches light differently as you move around it.',
    image: null, thumb: null,
  },
]

/** Upgrade artwork images from Wikipedia API (runs silently in background) */
export async function fetchWikiImages(artworks: Artwork[]): Promise<void> {
  await Promise.allSettled(
    artworks.filter(a => a.wikiTitle).map(async (aw) => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${aw.wikiTitle}`,
          { headers: { 'Api-User-Agent': 'artpiq-demo/2.0' }, signal: ctrl.signal }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        if (d.originalimage?.source) aw.image = d.originalimage.source
        if (d.thumbnail?.source) aw.thumb = d.thumbnail.source
      } catch {
        // silent — hardcoded images still show
      } finally {
        clearTimeout(timer)
      }
    })
  )
}
