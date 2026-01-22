interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'ToricCY',
    description: `A large, open-source database of >100k toric Calabi-Yau threefold vacuum spaces compatible with Type‐IIB string theory.
    Equipped with a searchable web interface serving the international String Theory community.`,
    imgSrc: '/static/images/toriccy.png',
    href: 'https://www.rossealtman.com/toriccy',
  },
  {
    title: 'Wikontext',
    description: `Smarter page previews for a smoother Wikipedia experience. 
    Show the most relevant parts of a linked Wikipedia article with the hover of your mouse.`,
    imgSrc: '/static/images/wikontext.png',
    href: 'https://www.wikontext.us',
  },
]

export default projectsData
