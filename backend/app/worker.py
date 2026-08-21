import logging
import time

from .db import SessionLocal
from .models import Job, JobStatus
from .pipeline import run_job

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def main():
    # ล้างสถานะของงานที่ค้างอยู่ในสถานะ PROCESSING ตอนเริ่มต้นระบบ (เช่น จากการรีสตาร์ท worker)
    # โดยปรับสถานะเป็น FAILED เพื่อให้ผู้ใช้สามารถอัปโหลดใหม่ได้และไม่ค้างในหน้า UI
    with SessionLocal() as db:
        stuck_jobs = db.query(Job).filter(Job.status == JobStatus.PROCESSING.value, Job.is_active == True).all()
        for job in stuck_jobs:
            job.status = JobStatus.FAILED.value
            job.error_text = "การประมวลผลหยุดชะงักเนื่องจากระบบถูกรีสตาร์ทหรือหยุดทำงานกะทันหัน"
            job.updated_by = job.user_id
        if stuck_jobs:
            db.commit()

    while True:
        with SessionLocal() as db:
            job = db.query(Job).filter(Job.status == JobStatus.PENDING.value, Job.is_active == True).order_by(Job.created_at).first()
            if job:
                logger.info("Picked up job %s (%s)", job.id, job.original_filename)
                run_job(db, job)
                logger.info("Job %s finished with status %s", job.id, job.status)
            else:
                time.sleep(3)


if __name__ == "__main__":
    main()
