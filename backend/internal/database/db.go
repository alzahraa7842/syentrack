package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"alumnitrack-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() *gorm.DB {
	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		host = "postgres"
	}
	user := os.Getenv("POSTGRES_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("POSTGRES_PASSWORD")
	if password == "" {
		password = "postgres"
	}
	dbname := os.Getenv("POSTGRES_DB")
	if dbname == "" {
		dbname = "tracer_study"
	}
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		host, user, password, dbname, port)

	var db *gorm.DB
	var err error

	// Retry loop for Docker startup healthcheck
	for i := 0; i < 15; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			break
		}
		log.Printf("Waiting for PostgreSQL to be ready... (%d/15) err: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("PostgreSQL connection established successfully.")

	// Auto-Migrate schema
	err = db.AutoMigrate(
		&models.User{},
		&models.Alumni{},
		&models.CareerHistory{},
		&models.FileAttachment{},
		&models.TracerSurvey{},
		&models.TracerQuestion{},
		&models.TracerResponse{},
		&models.JobPosting{},
		&models.ForumPost{},
		&models.ForumComment{},
		&models.Notification{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database schema: %v", err)
	}

	DB = db
	SeedData(db)

	return db
}

func SeedData(db *gorm.DB) {
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		return // already seeded
	}

	log.Println("Seeding initial administrator and demo alumni into PostgreSQL...")

	adminHash, _ := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)
	alumniHash, _ := bcrypt.GenerateFromPassword([]byte("Alumni123!"), bcrypt.DefaultCost)

	admin := models.User{
		Name:     "Guru BK",
		Email:    "admin@sekolah.sch.id",
		Password: string(adminHash),
		Role:     models.RoleAdmin,
		IsActive: true,
	}
	db.Create(&admin)

	// Alumni demo user
	alumniUser := models.User{
		Name:     "Budi Santoso",
		Email:    "budi.santoso@alumni.sch.id",
		NISN:     "0058291023",
		Password: string(alumniHash),
		Role:     models.RoleAlumni,
		IsActive: true,
	}
	db.Create(&alumniUser)

	alumniProfile := models.Alumni{
		UserID:       alumniUser.ID,
		Name:         "Budi Santoso",
		NISN:         "0058291023",
		Angkatan:     2024,
		Jurusan:      "PPLG",
		Email:        "budi.santoso@alumni.sch.id",
		Phone:        "0812-3456-7890",
		Domisili:     "Jakarta",
		StatusKarir:  "Bekerja",
		StatusTracer: "Sudah Mengisi",
		JobCompany:   "PT Telkom Indonesia (Persero) Tbk",
		JobPosition:  "Junior Frontend Engineer",
		JobIndustry:  "Teknologi Informasi",
		JobLocation:  "Jakarta Selatan",
		JobType:      "Full-time",
	}
	db.Create(&alumniProfile)

	// Tracer Survey
	survey := models.TracerSurvey{
		Title:          "Tracer Study Alumni Angkatan 2025",
		Description:    "Pendataan kondisi alumni setelah lulus dari sekolah untuk evaluasi kurikulum dan akreditasi.",
		TargetAngkatan: 2025,
		Deadline:       "2026-10-31",
		Status:         "Aktif",
		TotalTarget:    1205,
	}
	db.Create(&survey)

	// Lowongan
	job := models.JobPosting{
		Title:       "Junior Web Developer",
		Company:     "PT Astra Graphia IT",
		Location:    "Jakarta Pusat",
		Type:        "Full-time",
		Category:    "Lowongan kerja",
		Deadline:    "2026-11-15",
		Description: "Mencari lulusan SMK PPLG berbakat untuk mengembangkan aplikasi web enterprise.",
		Status:      "Published",
	}
	db.Create(&job)

	log.Println("Database seed completed successfully.")
}
