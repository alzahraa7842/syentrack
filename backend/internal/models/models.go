package models

import (
	"time"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleAdmin  UserRole = "ADMIN"
	RoleAlumni UserRole = "ALUMNI"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Email     string         `gorm:"size:255;uniqueIndex;not null" json:"email"`
	NISN      string         `gorm:"size:50;uniqueIndex" json:"nisn"`
	Password  string         `gorm:"size:255;not null" json:"-"`
	Role      UserRole       `gorm:"size:20;not null;default:'ALUMNI'" json:"role"`
	Avatar    string         `gorm:"size:500" json:"avatar"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Alumni struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"uniqueIndex;not null" json:"user_id"`
	User           User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	NISN           string         `gorm:"size:50;uniqueIndex;not null" json:"nisn"`
	Angkatan       int            `gorm:"not null" json:"angkatan"` // Tahun Lulus
	Jurusan        string         `gorm:"size:100;not null" json:"jurusan"`
	Email          string         `gorm:"size:255;not null" json:"email"`
	Phone          string         `gorm:"size:50" json:"phone"`
	Domisili       string         `gorm:"size:100" json:"domisili"`
	StatusKarir    string         `gorm:"size:50;default:'Mencari Kerja'" json:"status_karir"`
	StatusTracer   string         `gorm:"size:50;default:'Belum Mengisi'" json:"status_tracer"`
	Avatar         string         `gorm:"size:500" json:"avatar"`
	LinkedInURL    string         `gorm:"size:500" json:"linkedin_url"`
	PrivacySetting string         `gorm:"size:50;default:'PUBLIC'" json:"privacy_setting"`
	
	// Detail Pekerjaan
	JobCompany   string `gorm:"size:255" json:"job_company"`
	JobPosition  string `gorm:"size:255" json:"job_position"`
	JobIndustry  string `gorm:"size:255" json:"job_industry"`
	JobLocation  string `gorm:"size:255" json:"job_location"`
	JobStartDate string `gorm:"size:50" json:"job_start_date"`
	JobType      string `gorm:"size:50" json:"job_type"`

	// Detail Kuliah
	EduUniversity string `gorm:"size:255" json:"edu_university"`
	EduMajor      string `gorm:"size:255" json:"edu_major"`
	EduDegree     string `gorm:"size:50" json:"edu_degree"`
	EduLocation   string `gorm:"size:255" json:"edu_location"`
	EduStartYear  int    `json:"edu_start_year"`

	// Detail Wirausaha
	BizName      string `gorm:"size:255" json:"biz_name"`
	BizField     string `gorm:"size:255" json:"biz_field"`
	BizLocation  string `gorm:"size:255" json:"biz_location"`
	BizStartYear int    `json:"biz_start_year"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type CareerHistory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	AlumniID    uint      `gorm:"index;not null" json:"alumni_id"`
	YearStart   int       `json:"year_start"`
	YearEnd     int       `json:"year_end"`
	IsCurrent   bool      `gorm:"default:false" json:"is_current"`
	Position    string    `gorm:"size:255;not null" json:"position"`
	Company     string    `gorm:"size:255;not null" json:"company"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type FileAttachment struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	AlumniID   uint      `gorm:"index;not null" json:"alumni_id"`
	Name       string    `gorm:"size:255;not null" json:"name"`
	Category   string    `gorm:"size:50;not null" json:"category"` // CV, Portfolio, Sertifikat
	FileSizeKB int       `json:"file_size_kb"`
	FilePath   string    `gorm:"size:500;not null" json:"file_path"`
	MimeType   string    `gorm:"size:100;not null" json:"mime_type"`
	CreatedAt  time.Time `json:"created_at"`
}

type TracerSurvey struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Title          string         `gorm:"size:255;not null" json:"title"`
	Description    string         `gorm:"type:text" json:"description"`
	TargetAngkatan int            `json:"target_angkatan"`
	Deadline       string         `gorm:"size:50;not null" json:"deadline"`
	Status         string         `gorm:"size:20;default:'Aktif'" json:"status"`
	TotalTarget    int            `json:"total_target"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type TracerQuestion struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	SurveyID     uint      `gorm:"index;not null" json:"survey_id"`
	Section      string    `gorm:"size:255" json:"section"`
	QuestionText string    `gorm:"type:text;not null" json:"question_text"`
	QuestionType string    `gorm:"size:50;not null" json:"question_type"` // text, radio, rating, etc.
	OptionsJSON  string    `gorm:"type:text" json:"options_json"`
	Required     bool      `gorm:"default:true" json:"required"`
	Order        int       `gorm:"default:1" json:"order"`
	CreatedAt    time.Time `json:"created_at"`
}

type TracerResponse struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SurveyID    uint      `gorm:"index;not null" json:"survey_id"`
	AlumniID    uint      `gorm:"index;not null" json:"alumni_id"`
	Status      string    `gorm:"size:50;default:'Sudah Mengisi'" json:"status"`
	AnswersJSON string    `gorm:"type:text;not null" json:"answers_json"`
	CreatedAt   time.Time `json:"created_at"`
}

type JobPosting struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Title        string         `gorm:"size:255;not null" json:"title"`
	Company      string         `gorm:"size:255;not null" json:"company"`
	Location     string         `gorm:"size:255;not null" json:"location"`
	Type         string         `gorm:"size:50;not null" json:"type"`
	Category     string         `gorm:"size:50;not null" json:"category"`
	Deadline     string         `gorm:"size:50;not null" json:"deadline"`
	Description  string         `gorm:"type:text;not null" json:"description"`
	Requirements string         `gorm:"type:text" json:"requirements"`
	ApplyURL     string         `gorm:"size:500" json:"apply_url"`
	ContactEmail string         `gorm:"size:255" json:"contact_email"`
	Status       string         `gorm:"size:20;default:'Published'" json:"status"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type ForumPost struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	AuthorID    uint           `gorm:"index;not null" json:"author_id"`
	AuthorName  string         `gorm:"size:255;not null" json:"author_name"`
	AuthorRole  string         `gorm:"size:20;not null" json:"author_role"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	Category    string         `gorm:"size:50;not null" json:"category"`
	Likes       int            `gorm:"default:0" json:"likes"`
	IsLocked    bool           `gorm:"default:false" json:"is_locked"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type ForumComment struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	PostID     uint      `gorm:"index;not null" json:"post_id"`
	AuthorID   uint      `gorm:"index;not null" json:"author_id"`
	AuthorName string    `gorm:"size:255;not null" json:"author_name"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    *uint     `gorm:"index" json:"user_id"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	Type      string    `gorm:"size:50;not null" json:"type"`
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	Link      string    `gorm:"size:255" json:"link"`
	CreatedAt time.Time `json:"created_at"`
}

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserName  string    `gorm:"size:255;not null" json:"user_name"`
	UserRole  string    `gorm:"size:50;not null" json:"user_role"`
	Activity  string    `gorm:"size:500;not null" json:"activity"`
	IP        string    `gorm:"size:100;not null" json:"ip"`
	CreatedAt time.Time `json:"created_at"`
}
