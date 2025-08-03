package utils

func CompactImages(images []string) []string {
	// Create a new slice to hold non-empty images
	compact := []string{}

	// Collect all non-empty images
	for _, img := range images {
		if img != "" {
			compact = append(compact, img)
		}
	}

	// Create the result with proper padding
	result := make([]string, 4)
	for i := 0; i < len(compact) && i < 4; i++ {
		result[i] = compact[i]
	}

	return result
}

// Max returns the larger of two integers
func Max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
