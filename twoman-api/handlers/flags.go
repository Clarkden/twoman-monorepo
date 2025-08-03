package handlers

import (
	"errors"
	"net/http"
	"twoman/handlers/helpers/flags"
	"twoman/handlers/response"

	"gorm.io/gorm"
)

func (h Handler) HandleGetFeatureFlag() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientVersion := r.Header.Get("X-Client-Version")

		switch clientVersion {

		default:

			flagName := r.PathValue("name")

			if flagName == "" {
				response.BadRequest(w, "Flag name is required")
				return
			}

			featureFlag, err := flags.GetFeatureFlag(flagName, h.DB(r))

			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					response.NotFound(w, "Could not find flag")
					return
				}

				response.InternalServerError(w, err, "Something went wrong")
				return
			}

			response.OKWithData(w, "Successfully found flag", featureFlag)
		}

	})
}
