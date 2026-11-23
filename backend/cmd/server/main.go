package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"alumnitrack-backend/internal/database"
	"alumnitrack-backend/internal/middlewares"
	"alumnitrack-backend/internal/models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	log.Println("Starting AlumniTrack Go Gin Server...")

	db := database.ConnectDB()

	r := gin.Default()

	// CORS Configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")
	{
		// 1. Auth Endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/login", func(c *gin.Context) {
				var req struct {
					Email    string `json:"email"`
					Password string `json:"password"`
				}
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format request tidak valid"})
					return
				}

				var user models.User
				if err := db.Where("LOWER(email) = LOWER(?) OR LOWER(nisn) = LOWER(?)", req.Email, req.Email).First(&user).Error; err != nil {
					// Fallback: check if exists in alumni table, and auto-register user account
					var alumni models.Alumni
					if errAlumni := db.Where("LOWER(email) = LOWER(?) OR LOWER(nisn) = LOWER(?)", req.Email, req.Email).First(&alumni).Error; errAlumni == nil {
						hashed, _ := bcrypt.GenerateFromPassword([]byte("Alumni123!"), bcrypt.DefaultCost)
						user = models.User{
							Name:     alumni.Name,
							Email:    alumni.Email,
							NISN:     alumni.NISN,
							Password: string(hashed),
							Role:     models.RoleAlumni,
							IsActive: true,
						}
						db.Create(&user)
						alumni.UserID = user.ID
						db.Save(&alumni)
					} else {
						c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Akun tidak ditemukan"})
						return
					}
				}

				if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
					// Also accept default password or NISN as password
					if req.Password != "Alumni123!" && req.Password != user.NISN {
						c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Password salah"})
						return
					}
				}

				// Sign JWT
				secret := os.Getenv("JWT_SECRET")
				if secret == "" {
					secret = "alumnitrack_super_secret_jwt_key_2026"
				}

				claims := middlewares.JWTClaims{
					UserID: user.ID,
					Email:  user.Email,
					Role:   user.Role,
					RegisteredClaims: jwt.RegisteredClaims{
						ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
						IssuedAt:  jwt.NewNumericDate(time.Now()),
					},
				}
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
				tokenString, _ := token.SignedString([]byte(secret))

				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"message": "Login berhasil",
					"token":   tokenString,
					"user": gin.H{
						"id":    user.ID,
						"name":  user.Name,
						"email": user.Email,
						"role":  user.Role,
					},
				})
			})
		}

		// 2. Protected Alumni & Dashboard Endpoints
		api.GET("/admin/dashboard", middlewares.AuthMiddleware(), middlewares.AdminMiddleware(), func(c *gin.Context) {
			var totalAlumni int64
			var tracerCompleted int64
			db.Model(&models.Alumni{}).Count(&totalAlumni)
			db.Model(&models.Alumni{}).Where("status_tracer = ?", "Sudah Mengisi").Count(&tracerCompleted)

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"total_alumni":     totalAlumni,
					"tracer_completed": tracerCompleted,
					"response_rate":    float64(tracerCompleted) / float64(totalAlumni+1) * 100,
				},
			})
		})

		// 3. Alumni CRUD Endpoints
		api.GET("/admin/alumni", middlewares.AuthMiddleware(), middlewares.AdminMiddleware(), func(c *gin.Context) {
			var alumni []models.Alumni
			db.Find(&alumni)
			c.JSON(http.StatusOK, gin.H{"success": true, "data": alumni})
		})

		api.POST("/admin/alumni", middlewares.AuthMiddleware(), middlewares.AdminMiddleware(), func(c *gin.Context) {
			var item models.Alumni
			if err := c.ShouldBindJSON(&item); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
				return
			}
			// Sanitize: ensure no TKJ
			if item.Jurusan == "TKJ" {
				item.Jurusan = "PPLG"
			}

			// Automatically create login User account for this new alumni
			var user models.User
			if err := db.Where("LOWER(email) = LOWER(?) OR LOWER(nisn) = LOWER(?)", item.Email, item.NISN).First(&user).Error; err != nil {
				hashed, _ := bcrypt.GenerateFromPassword([]byte("Alumni123!"), bcrypt.DefaultCost)
				user = models.User{
					Name:     item.Name,
					Email:    item.Email,
					NISN:     item.NISN,
					Password: string(hashed),
					Role:     models.RoleAlumni,
					IsActive: true,
				}
				db.Create(&user)
			}
			item.UserID = user.ID
			db.Create(&item)
			c.JSON(http.StatusCreated, gin.H{
				"success": true, 
				"data": item,
				"message": "Data alumni berhasil ditambahkan dan akun login langsung aktif (Password: Alumni123!)",
			})
		})

		// 4. Jobs & Tracer Endpoints
		api.GET("/jobs", func(c *gin.Context) {
			var jobs []models.JobPosting
			db.Where("status = ?", "Published").Find(&jobs)
			c.JSON(http.StatusOK, gin.H{"success": true, "data": jobs})
		})

		api.GET("/tracer-study", func(c *gin.Context) {
			var surveys []models.TracerSurvey
			db.Find(&surveys)
			c.JSON(http.StatusOK, gin.H{"success": true, "data": surveys})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server listening on port :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
