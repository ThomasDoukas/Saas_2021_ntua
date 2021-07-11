import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ContributionDto } from './dto/contribution.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SearchQuestionDto } from './dto/search-question.dto';
import { Answer } from './entities/answer.entity';
import { Label } from './entities/label.entity';
import { Question } from './entities/question.entity';

@Injectable()
export class AppService {
    private client = ClientProxy;

    constructor(
        @InjectEntityManager('mAnalyticsQuestionsConnection') private manager: EntityManager
    ) {
    }

    async createQuestion(createQuestionDto: CreateQuestionDto): Promise<Question> {
        return this.manager.transaction(async manager => {
            const newQuestion = await manager.create(Question, createQuestionDto);
            return await manager.save(newQuestion);
        })
    }

    async updateQuestion(payload): Promise<Question> {
        // payload = {QuestionId, updateQuestion}
        return this.manager.transaction(async manager => {
            const questionExists = await manager.findOne(Question, payload.questionId);
            manager.merge(Question, questionExists, payload.updateQuestionDto);
            return await manager.save(questionExists)
        })
    }

    async deleteQuestion(payload): Promise<any> {
        return this.manager.transaction(async manager => {
            const questionExists = await manager.findOne(Question, payload, { relations: ['labels'] });
            const deletedQuestion = await manager.delete(Question, payload);
            const questionLabels = await manager.find(Label, {
                where: [
                    ...questionExists.labels
                ],
                relations: ['questions']
            })
            const deleteLabels = questionLabels
                .filter(
                    (el: { labelTitle: string, questions: Question[] }) => {
                        return el.questions.length === 0;
                    })
                .map((el: { labelTitle: string, questions: Question[] }) => {
                    return { labelTitle: el.labelTitle };
                })
            // Delete all labels with no questions (empty questions array)
            if (deleteLabels) await manager.delete(Label, [...deleteLabels]);

            return deletedQuestion;
        })
    }

    async createAnswer(createAnswerDto: CreateAnswerDto): Promise<Answer> {
        return this.manager.transaction(async manager => {
            const newAnswer = await manager.create(Answer, createAnswerDto);
            return await manager.save(newAnswer);
        })
    }

    async updateAnswer(payload): Promise<Answer> {
        // payload = {AnswerId, updateAnswer}
        return this.manager.transaction(async manager => {
            const answerExists = await manager.findOne(Answer, payload.answerId, { relations: ['question'] });
            manager.merge(Answer, answerExists, payload.updateAnswerDto);
            return await manager.save(answerExists);
        })
    }

    async deleteAnswer(payload): Promise<any> {
        return this.manager.transaction(async manager => {
            return await manager.delete(Answer, payload);
        })
    }

    // // Create new question
    // async createQuestion(createQuestionDto: CreateQuestionDto, user): Promise<Question> {
    //     return this.manager.transaction(async manager => {
    //         // findUserFromEmail already takes care of the exception if needed!
    //         // await this.usersService.findUserFromEmail(createQuestionDto.createdBy);
    //         if (user.email != createQuestionDto.createdBy) throw new ConflictException('User cannot create question for another email');
    //         const newQuestion = await manager.create(Question, createQuestionDto);
    //         return await manager.save(newQuestion);
    //     })
    // }

    // // Returns all questions REPLACED BY Search Questions
    // async findAllQuestions(): Promise<Question[]> {
    //     return await this.manager.find(Question, { relations: ['labels', 'answers'] })
    // }

    // Returns all labels DO NOT NEED THIS
    // async findAllLabels(): Promise<Label[]> {
    //     return await this.manager.find(Label, { relations: ['questions'] })
    // }

    // Find single question
    // async findOneQuestion(questionId: number): Promise<Question> {
    //     const questionExists = await this.manager.findOne(Question, questionId, { relations: ['labels', 'answers'] });
    //     if (!questionExists) throw new NotFoundException('Question does not exist!');
    //     return questionExists;
    // }

    // // Advanced questions searching
    // async searchQuestions(searchQuestionDto: SearchQuestionDto): Promise<Question[]> {
    //     return this.manager.transaction(async manager => {
    //         const query = manager.getRepository(Question)
    //             .createQueryBuilder('q')
    //             .leftJoinAndSelect('q.answers', 'a')

    //         // Search by Date
    //         if (searchQuestionDto.fromDate > searchQuestionDto.toDate) throw new BadRequestException('fromDate cannot take place after toDate!');
    //         if (searchQuestionDto.fromDate && searchQuestionDto.toDate)
    //             if (searchQuestionDto.fromDate === searchQuestionDto.toDate) {
    //                 // Same fromDate and toDate value specifies single day
    //                 query.andWhere('DATE(q.timeCreated) = DATE(:searchDate)', { searchDate: searchQuestionDto.fromDate })
    //             }
    //             else {
    //                 // Different values specify a period of time
    //                 query.andWhere('DATE(q.timeCreated) >= DATE(:from) AND DATE(q.timeCreated) <= DATE(:to)', { from: searchQuestionDto.fromDate, to: searchQuestionDto.toDate })
    //             }
    //         // For questions created after fromDate
    //         else if (searchQuestionDto.fromDate && !searchQuestionDto.toDate)
    //             query.andWhere('DATE(q.timeCreated) >= DATE(:searchDate)', { searchDate: searchQuestionDto.fromDate })
    //         // For questions created before toDate
    //         else if (!searchQuestionDto.fromDate && searchQuestionDto.toDate)
    //             query.andWhere('DATE(q.timeCreated) <= DATE(:searchDate)', { searchDate: searchQuestionDto.toDate })

    //         // Search by User
    //         if (searchQuestionDto.email)
    //             query.andWhere('q.createdBy = :email', { email: searchQuestionDto.email })

    //         // Search by Labels
    //         if (searchQuestionDto.labels)
    //             query.leftJoin('q.labels', 'labels')
    //                 .leftJoinAndSelect('q.labels', 'labelsSelect')
    //                 .andWhere('labels.labelTitle IN (:...title)', { title: searchQuestionDto.labels })
    //                 .orderBy('q.questionId', 'DESC', 'NULLS LAST')
    //         else
    //             query.leftJoinAndSelect('q.labels', 'labels')

    //         // Search by full text search
    //         if (searchQuestionDto.textSearch)
    //             query.andWhere(new Brackets(qb => {
    //                 qb.where('q.body ILIKE :query', { query: `%${searchQuestionDto.textSearch}%` })
    //                     .orWhere('q.title ILIKE :query', { query: `%${searchQuestionDto.textSearch}%` })
    //                     .orWhere('a.body ILIKE :query', { query: `%${searchQuestionDto.textSearch}%` })
    //             }))

    //         const res = await query.orderBy('q.timeCreated', 'DESC').getMany();
    //         return res;
    //     })

    // }

    // Get questions for each label - statistic purposes
    async findLabelQuestions(): Promise<Label[]> {
        return this.manager.transaction(async manager => {
            const query = await manager.getRepository(Label)
                .createQueryBuilder('l')
                .leftJoinAndSelect('l.questions', 'q')
                .groupBy('l.labelTitle')
                .select('l.labelTitle', 'labelTitle')
                .addSelect('COUNT(q)', 'counter')
                .orderBy('counter', 'DESC')
                .getRawMany();

            if (query.length > 10) {
                const show = query.slice(0, 10)
                console.log(show);

                const other = query.slice(10)
                const reducedOther = other.reduce(function (previousValue, currentValue) {
                    return {
                        labelTitle: "other",
                        counter: parseInt(previousValue.counter) + parseInt(currentValue.counter)
                    }
                });
                console.log(reducedOther);

                const res = show.concat(reducedOther);
                return res;
            }
            else
                return query;

        })
        // return this.manager.transaction(async manager => {
        //     const labelQuestions = manager.findAndCount(Label, { relations: ['questions', 'questions.answers'], order: { labelTitle: 'ASC' } })
        //     return labelQuestions;
        // })
    }

    // Get questions for each date - statistic purposes
    async findDateQuestions(contributionDto: ContributionDto): Promise<any> {
        // return this.manager.transaction(async manager => {
        // const query = await this.manager.createQueryBuilder(Question, "q")
        // .select('EXTRACT(DAY FROM q.timeCreated)', 'day')
        // .addSelect('COUNT(*)', 'questions')
        // .addSelect('a.answers', 'answers')
        // .leftJoin(subQuery =>
        //     subQuery
        //         .select('EXTRACT(DAY FROM ans.timeCreated)', 'day')
        //         .addSelect('COUNT(*)', 'answers')
        //         .addFrom(Answer, 'ans')
        //         .where('ans.createdBy = :email', { email: contributionDto.email })
        //         .andWhere('EXTRACT(YEAR FROM ans.timeCreated) = :year', { year: contributionDto.year })
        //         .andWhere('EXTRACT(MONTH FROM ans.timeCreated) = :month', { month: contributionDto.month })
        //         .addGroupBy('EXTRACT(DAY FROM ans.timeCreated)'),
        //     'a', 'a.day = EXTRACT(DAY FROM q.timeCreated)')
        // .where('q.createdBy = :email', { email: contributionDto.email })
        // .andWhere('EXTRACT(YEAR FROM q.timeCreated) = :year', { year: contributionDto.year })
        // .andWhere('EXTRACT(MONTH FROM q.timeCreated) = :month', { month: contributionDto.month })
        // .addGroupBy('EXTRACT(DAY FROM q.timeCreated)')
        // .addGroupBy('a.answers')
        // .getRawMany()
        const query = await this.manager
            .query(`
                    SELECT EXTRACT(DAY FROM "q"."timeCreated") AS "day", COUNT(*) AS "questions", a.answers AS "answers"
                    FROM "Questions" AS "q" 
                    LEFT JOIN(
                            SELECT EXTRACT(DAY FROM "ans"."timeCreated") AS "day", COUNT(*) AS "answers"
                            FROM "Answers" "ans"
                            WHERE EXTRACT(YEAR FROM "ans"."timeCreated") = ${contributionDto.year} AND EXTRACT(MONTH FROM "ans"."timeCreated") = ${contributionDto.month}
                            GROUP BY EXTRACT(DAY FROM "ans"."timeCreated")
                        )
                    "a" ON a.day = EXTRACT(DAY FROM "q"."timeCreated")
                    WHERE EXTRACT(YEAR FROM "q"."timeCreated") = ${contributionDto.year} AND EXTRACT(MONTH FROM "q"."timeCreated") = ${contributionDto.month}
                    GROUP BY EXTRACT(DAY FROM "q"."timeCreated"), a.answers
                `)

        const res = query.map(function (obj) {
            obj.answers = (obj.answers === null ? 0 : obj.answers);
            return obj;
        });
        return res;
        // })
    }

    async findDailyContribution(contributionDto: ContributionDto, user): Promise<any> {
        if (!contributionDto.email) throw new BadRequestException('Please provide user email!')
        if (contributionDto.email != user.email) throw new ConflictException('User email does not match jwt email.')
        // const query = await this.manager.createQueryBuilder(Question, "q")
        //     .select('EXTRACT(DAY FROM q.timeCreated)', 'day')
        //     .addSelect('COUNT(*)', 'questions')
        //     .addSelect('a.answers', 'answers')
        //     .leftJoin(subQuery =>
        //         subQuery
        //             .select('EXTRACT(DAY FROM ans.timeCreated)', 'day')
        //             .addSelect('COUNT(*)', 'answers')
        //             .addFrom(Answer, 'ans')
        //             .where('ans.createdBy = :email', { email: contributionDto.email })
        //             .andWhere('EXTRACT(YEAR FROM ans.timeCreated) = :year', { year: contributionDto.year })
        //             .andWhere('EXTRACT(MONTH FROM ans.timeCreated) = :month', { month: contributionDto.month })
        //             .addGroupBy('EXTRACT(DAY FROM ans.timeCreated)'),
        //         'a', 'a.day = EXTRACT(DAY FROM q.timeCreated)')
        //     .where('q.createdBy = :email', { email: contributionDto.email })
        //     .andWhere('EXTRACT(YEAR FROM q.timeCreated) = :year', { year: contributionDto.year })
        //     .andWhere('EXTRACT(MONTH FROM q.timeCreated) = :month', { month: contributionDto.month })
        //     .addGroupBy('EXTRACT(DAY FROM q.timeCreated)')
        //     .addGroupBy('a.answers')
        //     .getRawMany()
        const query = await this.manager
            .query(`
                SELECT EXTRACT(DAY FROM "q"."timeCreated") AS "day", COUNT(*) AS "questions", a.answers AS "answers"
                FROM "Questions" "q"
                LEFT JOIN
                (
                    SELECT EXTRACT(DAY FROM "ans"."timeCreated") AS "day", COUNT(*) AS "answers" 
                    FROM "Answers" "ans" 
                    WHERE "ans"."createdBy" = '${contributionDto.email}' AND EXTRACT(YEAR FROM "ans"."timeCreated") = ${contributionDto.year} AND EXTRACT(MONTH FROM "ans"."timeCreated") = ${contributionDto.month}
                    GROUP BY EXTRACT(DAY FROM "ans"."timeCreated")
                )
                "a" ON a.day = EXTRACT(DAY FROM "q"."timeCreated") WHERE "q"."createdBy" = '${contributionDto.email}' AND EXTRACT(YEAR FROM "q"."timeCreated") = ${contributionDto.year} AND EXTRACT(MONTH FROM "q"."timeCreated") = ${contributionDto.month} 
                GROUP BY EXTRACT(DAY FROM "q"."timeCreated"), a.answers
            `)

        const res = query.map(function (obj) {
            obj.answers = (obj.answers === null ? 0 : obj.answers);
            return obj;
        });
        return res;
    }
    // // Get questions for each date - statistic purposes
    // async findDateQuestions(searchQuestionDto): Promise<any> {
    //     return this.manager.transaction(async manager => {
    //         const query = manager.getRepository(Question)
    //             .createQueryBuilder('q')

    //         // Search by Date
    //         if (searchQuestionDto.fromDate > searchQuestionDto.toDate) throw new BadRequestException('fromDate cannot take place after toDate!');
    //         if (searchQuestionDto.fromDate && searchQuestionDto.toDate) {
    //             // let temp = searchQuestionDto.fromDate
    //             if (searchQuestionDto.fromDate === searchQuestionDto.toDate) {
    //                 // Same fromDate and toDate value specifies single day
    //                 query.andWhere('DATE(q.timeCreated) = DATE(:searchDate)', { searchDate: searchQuestionDto.fromDate })
    //             }
    //             else {
    //                 // Different values specify a period of time
    //                 query.andWhere('DATE(q.timeCreated) >= DATE(:from) AND DATE(q.timeCreated) <= DATE(:to)', { from: searchQuestionDto.fromDate, to: searchQuestionDto.toDate })
    //             }
    //         }
    //         // For questions created after fromDate
    //         else if (searchQuestionDto.fromDate && !searchQuestionDto.toDate)
    //             query.andWhere('DATE(q.timeCreated) >= DATE(:searchDate)', { searchDate: searchQuestionDto.fromDate })
    //         // For questions created before toDate
    //         else if (!searchQuestionDto.fromDate && searchQuestionDto.toDate)
    //             query.andWhere('DATE(q.timeCreated) <= DATE(:searchDate)', { searchDate: searchQuestionDto.toDate })

    //         query.groupBy('DATE(q.timeCreated)')
    //             .select('DATE(q.timeCreated)', 'timeCreated')
    //             .addSelect('COUNT(q)', 'questionCounter')
    //         const res = await query.orderBy('DATE(q.timeCreated)', 'DESC').getRawMany();

    //         return res.map(el => {
    //             return {
    //                 // 'timeCreated': `${el.timeCreated.getUTCFullYear()}-${el.timeCreated.getUTCMonth()}-${el.timeCreated.getUTCDate()}`,
    //                 'timeCreated': new Date(el.timeCreated.setHours(el.timeCreated.getHours() - (el.timeCreated.getTimezoneOffset() / 60))),
    //                 'questionsCounter': el.questionCounter
    //             }
    //         })
    //     })
    // }

    // // Get user contribution per date - statistic purposes
    // async findDailyContribution(searchQuestionDto: SearchQuestionDto): Promise<any> {
    //     return this.manager.transaction(async manager => {
    //         if (!searchQuestionDto.email) throw new BadRequestException('Please provide user email!')

    //         const questions: { timeCreated: Date, questionCounter: string }[] = await manager.getRepository(Question)
    //             .createQueryBuilder('q')
    //             .where('q.createdBy = :email', { email: searchQuestionDto.email })
    //             .groupBy('DATE(q.timeCreated)')
    //             .select('DATE(q.timeCreated)', 'timeCreated')
    //             .addSelect('COUNT(q)', 'questionCounter')
    //             .orderBy('DATE(q.timeCreated)', 'DESC')
    //             .getRawMany();

    //         const answers: { timeCreated: Date, answerCounter: string }[] = await manager.getRepository(Answer)
    //             .createQueryBuilder('a')
    //             .where('a.createdBy = :email', { email: searchQuestionDto.email })
    //             .groupBy('DATE(a.timeCreated)')
    //             .select('DATE(a.timeCreated)', 'timeCreated')
    //             .addSelect('COUNT(a)', 'answerCounter')
    //             .orderBy('DATE(a.timeCreated)', 'DESC')
    //             .getRawMany();

    //         const res = {
    //             'questions': questions.map(el => {
    //                 return {
    //                     // 'timeCreated': `${el.timeCreated.getUTCFullYear()}-${el.timeCreated.getUTCMonth()}-${el.timeCreated.getUTCDate()}`,
    //                     'timeCreated': new Date(el.timeCreated.setHours(el.timeCreated.getHours() - (el.timeCreated.getTimezoneOffset() / 60))),
    //                     'questionsCounter': el.questionCounter
    //                 }
    //             }),
    //             'answers': answers.map(el => {
    //                 return {
    //                     'timeCreated': new Date(el.timeCreated.setHours(el.timeCreated.getHours() - (el.timeCreated.getTimezoneOffset() / 60))),
    //                     'answersCounter': el.answerCounter
    //                 }
    //             })
    //         }

    //         return res
    //     })
    // }

    // // Get Users Questions
    // async findUserQuestions(searchQuestionDto: SearchQuestionDto, user): Promise<Question[]> {
    //     return this.manager.transaction(async manager => {
    //         // findUserFromEmail already takes care of the exception if needed!
    //         if (!searchQuestionDto.email) throw new BadRequestException('Please provide user email')
    //         // await this.usersService.findUserFromEmail(searchQuestionDto.email);
    //         if (user.email != searchQuestionDto.email) throw new ConflictException('User cannot search questions created by another account from here');
    //         const userQuestions = manager.find(Question, { where: { createdBy: searchQuestionDto.email }, relations: ['labels', 'answers'] })
    //         return userQuestions;
    //     })
    // }

    // // Update question
    // async updateQuestion(questionId: number, updateQuestionDto: UpdateQuestionDto, user): Promise<Question> {
    //     return this.manager.transaction(async manager => {
    //         const questionExists = await manager.findOne(Question, questionId);
    //         if (!questionExists) throw new NotFoundException(`Question ${questionId} not found!`);
    //         if (user.email != updateQuestionDto.createdBy) throw new ConflictException('User can only create or update his own questions');
    //         manager.merge(Question, questionExists, updateQuestionDto);
    //         return await manager.save(questionExists);
    //     })
    // }

    // // Delete question
    // async removeQuestion(questionId: number, user): Promise<any> {
    //     return this.manager.transaction(async manager => {
    //         const questionExists = await manager.findOne(Question, questionId, { relations: ['labels'] });
    //         if (!questionExists) throw new NotFoundException('Question not found!');
    //         if (user.email != questionExists.createdBy) throw new ConflictException('User cannot delete questions created by another user');
    //         const deletedQuestion = await manager.delete(Question, questionId);

    //         // Check wether or not we should delete this question's labels.
    //         // Find all labels of deleted question
    //         const questionLabels = await manager.find(Label, {
    //             where: [
    //                 ...questionExists.labels
    //             ],
    //             relations: ['questions']
    //         })

    //         // For each label check the corresponding questions
    //         const deleteLabels = questionLabels
    //             .filter(
    //                 (el: { labelTitle: string, questions: Question[] }) => {
    //                     return el.questions.length === 0;
    //                 })
    //             .map((el: { labelTitle: string, questions: Question[] }) => {
    //                 return { labelTitle: el.labelTitle };
    //             })
    //         // Delete all labels with no questions (empty questions array)
    //         if (deleteLabels) await manager.delete(Label, [...deleteLabels]);

    //         // Running
    //         // for (let i = 0; i < questionExists.labels.length; i++){
    //         //     const test = await manager.findOne(Label, questionExists.labels[i], {relations: ['questions']});
    //         //     if(test.questions.length === 0)
    //         //         await manager.delete(Label, test.labelTitle)
    //         // }

    //         return deletedQuestion;
    //     });
    // }
}
