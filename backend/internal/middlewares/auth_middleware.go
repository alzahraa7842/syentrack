package middlewares

import (
	"net/http"
	"os"
	"strings"

	"alumnitrack-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID uint            `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Otorisasi token tidak ditemukan"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Format token otorisasi tidak valid"})
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "alumnitrack_super_secret_jwt_key_2026"
		}

		tokenString := parts[1]
		claims := &JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Sesi token kedaluwarsa atau tidak valid"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists || roleVal.(models.UserRole) != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Akses ditolak: Hanya administrator yang berwenang"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func AlumniMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists || roleVal.(models.UserRole) != models.RoleAlumni {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Akses ditolak: Hanya alumni yang berwenang"})
			c.Abort()
			return
		}
		c.Next()
	}
}
