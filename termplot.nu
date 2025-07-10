plugin use termplot

export def "termplot view" []: [record -> nothing] {
  termplot render | node display-image.ts
}
