package types

import "html/template"

type PageData struct {
	Title   string
	Content template.HTML
}
