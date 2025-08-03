package globals

type contextKey string

const SessionMiddlewareKey contextKey = "session"
const DatabaseConnKey contextKey = "databaseConn"
const AdminMiddlewareKey contextKey = "adminID"
