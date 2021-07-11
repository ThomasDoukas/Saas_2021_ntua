import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Answer } from 'src/answers/entities/answer.entity';
import { Label } from 'src/questions/entities/label.entity';
import { Question } from 'src/questions/entities/question.entity';
import { SearchQuestionDto } from './dto/search-question.dto';
import { query } from 'express';
import { ContributionDto } from './dto/contribution.dto';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectEntityManager('questionsConnection') private manager: EntityManager,
    ) { }

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

            if(query.length > 10){
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

    // Get questions for each date - statistic purposes
    async findDateQuestions(contributionDto: ContributionDto): Promise<any> {
        return this.manager.transaction(async manager => {
            const query = await manager.createQueryBuilder(Question, "q")
                .select('EXTRACT(DAY FROM q.timeCreated)', 'day')
                .addSelect('COUNT(*)', 'questions')
                .addSelect('a.answers', 'answers')
                .leftJoin(subQuery =>
                    subQuery
                        .select('EXTRACT(DAY FROM ans.timeCreated)', 'day')
                        .addSelect('COUNT(*)', 'answers')
                        .addFrom(Answer, 'ans')
                        .where('EXTRACT(YEAR FROM ans.timeCreated) = :year', { year: contributionDto.year })
                        .andWhere('EXTRACT(MONTH FROM ans.timeCreated) = :month', { month: contributionDto.month })
                        .addGroupBy('EXTRACT(DAY FROM ans.timeCreated)'),
                    'a', 'a.day = EXTRACT(DAY FROM q.timeCreated)')
                .where('EXTRACT(YEAR FROM q.timeCreated) = :year', { year: contributionDto.year })
                .andWhere('EXTRACT(MONTH FROM q.timeCreated) = :month', { month: contributionDto.month })
                .addGroupBy('EXTRACT(DAY FROM q.timeCreated)')
                .addGroupBy('a.answers')
                .getRawMany()

            return query;
        })
    }

    // // Get user contribution per date - statistic purposes
    // async findDailyContribution(searchQuestionDto: SearchQuestionDto, user): Promise<any> {
    //     return this.manager.transaction(async manager => {
    //         if (!searchQuestionDto.email) throw new BadRequestException('Please provide user email!')
    //         if (searchQuestionDto.email != user.email) throw new ConflictException('User email does not match jwt email.')

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

    async findDailyContribution(contributionDto: ContributionDto, user): Promise<any> {
        if (!contributionDto.email) throw new BadRequestException('Please provide user email!')
        if (contributionDto.email != user.email) throw new ConflictException('User email does not match jwt email.')

        const query = await this.manager.createQueryBuilder(Question, "q")
            .select('EXTRACT(DAY FROM q.timeCreated)', 'day')
            .addSelect('COUNT(*)', 'questions')
            .addSelect('a.answers', 'answers')
            .leftJoin(subQuery =>
                subQuery
                    .select('EXTRACT(DAY FROM ans.timeCreated)', 'day')
                    .addSelect('COUNT(*)', 'answers')
                    .addFrom(Answer, 'ans')
                    .where('ans.createdBy = :email', { email: contributionDto.email })
                    .andWhere('EXTRACT(YEAR FROM ans.timeCreated) = :year', { year: contributionDto.year })
                    .andWhere('EXTRACT(MONTH FROM ans.timeCreated) = :month', { month: contributionDto.month })
                    .addGroupBy('EXTRACT(DAY FROM ans.timeCreated)'),
                'a', 'a.day = EXTRACT(DAY FROM q.timeCreated)')
            .where('q.createdBy = :email', { email: contributionDto.email })
            .andWhere('EXTRACT(YEAR FROM q.timeCreated) = :year', { year: contributionDto.year })
            .andWhere('EXTRACT(MONTH FROM q.timeCreated) = :month', { month: contributionDto.month })
            .addGroupBy('EXTRACT(DAY FROM q.timeCreated)')
            .addGroupBy('a.answers')
            .getRawMany()
        return query;
    }

}
