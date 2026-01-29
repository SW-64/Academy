// import { Test, TestingModule } from '@nestjs/testing';
// import { VideosService } from './videos.service';
// import { BadRequestException } from '@nestjs/common';

// describe('VideosService', () => {
//   let service: VideosService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [VideosService],
//     }).compile();

//     service = module.get<VideosService>(VideosService);
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });
// });

// describe('VideosService - studentIds 검증', () => {
//   let service: VideosService;

//   it('존재하지 않는 studentId로 업로드 시 BadRequestException', async () => {
//     const dto = {
//       title: 'Test Video',
//       studentIds: [9999, 10000], // 존재하지 않는 ID
//     };
//     const file = {} as Express.Multer.File;

//     await expect(service.uploadVideo(dto, file, 1)).rejects.toThrow(
//       BadRequestException,
//     );
//   });

//   it('중복된 studentId는 제거되어야 함', async () => {
//     // studentRepository mock 설정
//     jest
//       .spyOn(studentRepository, 'find')
//       .mockResolvedValue([
//         { studentId: 1 } as Student,
//         { studentId: 2 } as Student,
//       ]);

//     const dto = {
//       title: 'Test Video',
//       studentIds: [1, 2, 1, 2], // 중복
//     };

//     // ... 업로드 로직 실행

//     // createVideoDto.studentIds가 [1, 2]로 정리되었는지 확인
//     expect(dto.studentIds).toEqual([1, 2]);
//   });

//   it('일부 studentId만 존재하지 않으면 에러 메시지에 표시', async () => {
//     jest
//       .spyOn(studentRepository, 'find')
//       .mockResolvedValue([{ studentId: 1 } as Student]);

//     const dto = {
//       title: 'Test Video',
//       studentIds: [1, 999, 1000],
//     };

//     await expect(
//       service.uploadVideo(dto, {} as Express.Multer.File, 1),
//     ).rejects.toThrow('존재하지 않는 학생 ID가 포함되어 있습니다: 999, 1000');
//   });
// });
