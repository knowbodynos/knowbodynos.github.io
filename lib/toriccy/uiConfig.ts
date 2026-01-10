// lib/toriccy/uiConfig.ts
export type CollectionName = 'POLY' | 'GEOM' | 'TRIANG' | 'INVOL' | 'SWISSCHEESE'

export type FieldGroup = {
  title: string
  fields: readonly string[]
}

export type CollectionUiConfig = {
  label: string
  // Grouped ordering for checkbox UI
  fieldGroups: readonly FieldGroup[]
  // Flattened list (derived) convenience
  fields: readonly string[]
  // Allowed WHERE
  filterableFields: readonly string[]
  // Allowed sort fields (per-card dropdowns)
  sortableFields: readonly string[]
  // Optional: hover/tooltip text per field
  fieldHelp: Record<string, string>
}

function flatten(groups: readonly FieldGroup[]) {
  return groups.flatMap((g) => g.fields)
}

// A small helper to reduce repetition in fieldHelp
function help(map: Record<string, string>) {
  return map
}

export type Operator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'

export const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in (comma-separated)' },
] as const

export const COLLECTIONS: Record<CollectionName, CollectionUiConfig> = {
  POLY: (() => {
    const fieldGroups: FieldGroup[] = [
      {
        title: 'Identifiers & join keys',
        fields: ['POLYID', 'POLYN'],
      },
      {
        title: 'Matched row counts',
        fields: ['NGEOMS', 'NALLTRIANGS'],
      },
      {
        title: 'Topological invariants',
        fields: ['H11', 'H21', 'EULER', 'FAV', 'FUNDGP'],
      },
      {
        title: 'Polytope vertex features',
        fields: ['NNPOINTS', 'NDPOINTS', 'NNVERTS', 'NDVERTS', 'NVERTS', 'DVERTS', 'DRESVERTS'],
      },
      {
        title: 'Combined weight systems',
        fields: ['CWS', 'RESCWS'],
      },
      {
        title: 'Basis transformations',
        fields: ['BASIS', 'INVBASIS', 'DTOJ', 'JTOD'],
      },
    ]

    return {
      label: 'Polytope Features (POLY)',
      fieldGroups,
      fields: flatten(fieldGroups),
      filterableFields: [
        'POLYID',
        'POLYN',
        'H11',
        'H21',
        'EULER',
        'FAV',
        'FUNDGP',
        'NGEOMS',
        'NALLTRIANGS',
        'NNPOINTS',
        'NDPOINTS',
        'NNVERTS',
        'NDVERTS',
        'NVERTS',
        'DVERTS',
        'DRESVERTS',
        'CWS',
        'RESCWS',
        'BASIS',
        'INVBASIS',
        'DTOJ',
        'JTOD',
      ],
      sortableFields: [
        'POLYID',
        'POLYN',
        'H11',
        'H21',
        'EULER',
        'FUNDGP',
        'NGEOMS',
        'NALLTRIANGS',
        'NNPOINTS',
        'NDPOINTS',
        'NNVERTS',
        'NDVERTS',
      ],
      fieldHelp: help({
        POLYID: 'Polytope identifier.',
        POLYN: 'Polytope index.',
        H11: 'Hodge number h^{1,1}.',
        H21: 'Hodge number h^{2,1}.',
        EULER: 'Euler characteristic.',
        FAV: 'Is favorable?',
        FUNDGP: 'Fundamental group.',
        NVERTS: 'Newton polytope vertices.',
        NNVERTS: 'Number of Newton polytope vertices.',
        NDVERTS: 'Number of dual polyotpe vertices.',
        NNPOINTS: 'Number of Newton polytope points.',
        NDPOINTS: 'Number of dual polyotpe vertices.',
        NGEOMS: 'Number of glued geometries under this polytope.',
        NALLTRIANGS: 'Total number of triangulations under this polytope.',
        BASIS: 'Divisor-to-basis matrix.',
        INVBASIS: 'Basis-to-divisor matrix.',
        DTOJ: 'Divisor-to-basis mapping.',
        JTOD: 'Basis-to-divisors mapping.',
        CWS: 'Combined weight system (CWS).',
        RESCWS: 'Resolved CWS.',
        DVERTS: 'Dual polytope vertex list.',
        DRESVERTS: 'Resolved dual polytope vertex list.',
      }),
    }
  })(),

  GEOM: (() => {
    const fieldGroups: FieldGroup[] = [
      {
        title: 'Identifiers & join keys',
        fields: ['POLYID', 'GEOMN'],
      },
      {
        title: 'Matched row counts',
        fields: ['NTRIANGS'],
      },
      {
        title: 'Topological invariants',
        fields: ['H11', 'CHERN2XNUMS', 'CHERN2XJ', 'IPOLYXJ', 'ITENSXJ'],
      },
      {
        title: 'Mori & Kähler cone matrices',
        fields: ['MORIMAT', 'KAHLERMAT'],
      },
    ]

    return {
      label: 'Glued CY Geometry Features (GEOM)',
      fieldGroups,
      fields: flatten(fieldGroups),
      filterableFields: [
        'POLYID',
        'GEOMN',
        'H11',
        'CHERN2XNUMS',
        'CHERN2XJ',
        'IPOLYXJ',
        'ITENSXJ',
        'NTRIANGS',
        'MORIMAT',
        'KAHLERMAT',
      ],
      sortableFields: ['POLYID', 'GEOMN', 'H11', 'NTRIANGS'],
      fieldHelp: help({
        POLYID: 'Polytope identifier.',
        GEOMN: 'Geometry index under parent polytope.',
        H11: 'Hodge number h^{1,1}.',
        NTRIANGS: 'Number of triangulations under a geometry.',
        CHERN2XNUMS: 'Second Chern class numbers for CY.',
        CHERN2XJ: 'Second Chern class in basis for CY.',
        MORIMAT: 'Mori cone matrix.',
        KAHLERMAT: 'Kähler cone matrix.',
        IPOLYXJ: 'Intersection polynomial in basis for CY.',
        ITENSXJ: 'Intersection tensor in basis for CY.',
      }),
    }
  })(),

  TRIANG: (() => {
    const fieldGroups: FieldGroup[] = [
      {
        title: 'Identifiers & join keys',
        fields: ['POLYID', 'GEOMN', 'TRIANGN', 'ALLTRIANGN'],
      },
      {
        title: 'Matched row counts',
        fields: ['NTRIANGS', 'NINVOL'],
      },
      {
        title: 'Topological invariants',
        fields: [
          'H11',
          'CHERNAD',
          'CHERNAJ',
          'CHERN2XD',
          'CHERN2XJ',
          'CHERN3XD',
          'CHERN3XJ',
          'IPOLYAD',
          'IPOLYAJ',
          'IPOLYXD',
          'ITENSAD',
          'ITENSAJ',
          'ITENSXD',
        ],
      },
      {
        title: 'Triangulation decompositions',
        fields: ['TRIANG'],
      },
      {
        title: 'Algebraic features',
        fields: ['DIVCOHOM', 'SRIDEAL'],
      },
      {
        title: 'Mori & Kähler cone matrices',
        fields: ['MORIMATP', 'KAHLERMATP'],
      },
    ]

    return {
      label: 'Triangulation / Kähler Cone Phase Features (TRIANG)',
      fieldGroups,
      fields: flatten(fieldGroups),
      filterableFields: [
        'POLYID',
        'GEOMN',
        'TRIANGN',
        'ALLTRIANGN',
        'TRIANG',
        'H11',
        'CHERNAD',
        'CHERNAJ',
        'CHERN2XD',
        'CHERN2XJ',
        'CHERN3XD',
        'CHERN3XJ',
        'IPOLYAD',
        'IPOLYAJ',
        'IPOLYXD',
        'ITENSAD',
        'ITENSAJ',
        'ITENSXD',
        'NTRIANGS',
        'NINVOL',
        'DIVCOHOM',
        'SRIDEAL',
        'MORIMATP',
        'KAHLERMATP',
      ],
      sortableFields: ['POLYID', 'GEOMN', 'TRIANGN', 'ALLTRIANGN', 'H11', 'NTRIANGS', 'NINVOL'],
      fieldHelp: help({
        POLYID: 'Polytope identifier.',
        GEOMN: 'Geometry index under parent polytope.',
        TRIANGN: 'Triangulation index under parent geometry.',
        ALLTRIANGN: 'Triangulation index under parent polytope.',
        H11: 'Hodge number h^{1,1}.',
        NINVOL: 'Number of involutions under this triangulation.',
        NTRIANGS: 'Number of triangulations under parent geometry.',
        CHERNAD: 'Ambient Chern classes (Toric).',
        CHERNAJ: 'Ambient Chern classes (Basis).',
        CHERN2XD: 'CY 2nd Chern class (Toric).',
        CHERN2XJ: 'CY 2nd Chern class (Basis).',
        CHERN3XD: 'CY 3rd Chern class (Toric).',
        CHERN3XJ: 'CY 3rd Chern class (Basis).',
        DIVCOHOM: 'Divisor cohomology.',
        SRIDEAL: 'Stanley–Reisner ideal.',
        ITENSAD: 'Ambient intersection tensor (Toric).',
        ITENSAJ: 'Ambient intersection tensor (Basis).',
        ITENSXD: 'CY intersection tensor (Toric).',
        IPOLYAD: 'Ambient intersection polynomial (Toric).',
        IPOLYAJ: 'Ambient intersection polynomial (Basis).',
        IPOLYXD: 'CY intersection polynomial (Toric).',
        KAHLERMATP: 'Phase Kähler cone matrix.',
        MORIMATP: 'Phase Mori cone matrix.',
        TRIANG: 'Triangulation.',
      }),
    }
  })(),

  INVOL: (() => {
    const fieldGroups: FieldGroup[] = [
      {
        title: 'Identifiers & join keys',
        fields: ['POLYID', 'GEOMN', 'TRIANGN', 'INVOLN'],
      },
      {
        title: 'Matched key counts',
        fields: ['NCYTERMS', 'NSYMCYTERMS'],
      },
      {
        title: 'Topological invariants',
        fields: ['H11', 'H11+', 'H11-', 'H21+', 'H21-', 'VOLFORMPARITY', 'ITENSXDINVOL'],
      },
      {
        title: 'Manifold smoothness features',
        fields: ['SMOOTH', 'CYSINGDIM'],
      },
      {
        title: 'Orientifold involution features',
        fields: ['INVOL', 'SRINVOL', 'INVOLDIVCOHOM', 'CYPOLY', 'SYMCYPOLY', 'OPLANES'],
      },
    ]

    return {
      label: 'Orientifold Involution Features (INVOL)',
      fieldGroups,
      fields: flatten(fieldGroups),
      filterableFields: [
        'POLYID',
        'GEOMN',
        'TRIANGN',
        'INVOLN',
        'H11',
        'H11+',
        'H11-',
        'H21+',
        'H21-',
        'VOLFORMPARITY',
        'ITENSXDINVOL',
        'NCYTERMS',
        'NSYMCYTERMS',
        'SMOOTH',
        'CYSINGDIM',
        'INVOL',
        'SRINVOL',
        'INVOLDIVCOHOM',
        'CYPOLY',
        'SYMCYPOLY',
        'OPLANES',
      ],
      sortableFields: [
        'POLYID',
        'GEOMN',
        'TRIANGN',
        'INVOLN',
        'H11',
        'H11+',
        'H11-',
        'H21+',
        'H21-',
        'VOLFORMPARITY',
        'NCYTERMS',
        'NSYMCYTERMS',
        'SMOOTH',
        'CYSINGDIM',
      ],
      fieldHelp: help({
        POLYID: 'Polytope identifier.',
        GEOMN: 'Geometry index under parent polytope.',
        TRIANGN: 'Triangulation index under parent geometry.',
        INVOLN: 'Involution index under parent triangulation.',
        H11: 'Hodge number h^{1,1}.',
        'H11+': 'Hodge number h^{1,1}_+ invariant under involution.',
        'H11-': 'Hodge number h^{1,1}_- anti-invariant under involution.',
        'H21+': 'Hodge number h^{2,1}_+ invariant under involution.',
        'H21-': 'Hodge number h^{2,1}_- anti-invariant under involution.',
        VOLFORMPARITY: 'Parity of the volume form under involution.',
        SMOOTH: 'Is CY is smooth under involution?',
        CYSINGDIM: 'CY singularity dimension.',
        OPLANES: 'Orientifold planes.',
        NCYTERMS: 'Number of CY polynomial terms.',
        NSYMCYTERMS: 'Number of symmetric CY polynomial terms.',
        INVOL: 'Involution.',
        SRINVOL: 'Stanley–Reisner ideal under involution.',
        INVOLDIVCOHOM: 'Divisor cohomology under involution.',
        CYPOLY: 'CY polynomial.',
        SYMCYPOLY: 'Symmetrized CY polynomial.',
        ITENSXDINVOL: 'CY intersection tensor under involution (Toric).',
      }),
    }
  })(),

  SWISSCHEESE: (() => {
    const fieldGroups: FieldGroup[] = [
      {
        title: 'Identifiers & join keys',
        fields: ['POLYID', 'GEOMN'],
      },
      {
        title: 'Topological invariants',
        fields: ['H11'],
      },
      {
        title: 'Swiss-cheese LVS structures',
        fields: ['EXPLICIT'],
      },
    ]

    return {
      label: 'Swiss-cheese Large Volume Scenario Features (SWISSCHEESE)',
      fieldGroups,
      fields: flatten(fieldGroups),
      filterableFields: ['POLYID', 'GEOMN', 'H11', 'EXPLICIT'],
      sortableFields: ['POLYID', 'GEOMN', 'H11'],
      fieldHelp: help({
        POLYID: 'Polytope identifier.',
        GEOMN: 'Geometry index under parent polytope.',
        H11: 'Hodge number h^{1,1}.',
        EXPLICIT: 'Does an explicit swiss-cheese decomposition exist?',
      }),
    }
  })(),
}
